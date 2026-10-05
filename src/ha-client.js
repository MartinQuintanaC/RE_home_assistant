import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { config } from './config.js';

class HomeAssistantClient extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.messageId = 1;
    this.reconnectTimeout = null;

    // Registros de Home Assistant
    this.deviceRegistry = new Map(); // device_id -> device info
    this.entityRegistry = new Map(); // entity_id -> entity registry entry (incluye disabled_by y device_id)
    this.states = new Map();         // entity_id -> current state & attributes
    this.pendingCallbacks = new Map();
  }

  init() {
    if (!config.token) {
      throw new Error('HA_TOKEN no configurado en .env');
    }
    this.connectWs();
  }

  connectWs() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    console.log(`🔌 [HA-Client] Conectando a ${config.haWsUrl}...`);
    this.ws = new WebSocket(config.haWsUrl);

    this.ws.on('open', () => {
      console.log('🌐 [HA-Client] Socket abierto.');
    });

    this.ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await this.handleMessage(msg);
      } catch (err) {
        console.error('⚠️ [HA-Client] Error parseando mensaje:', err.message);
      }
    });

    this.ws.on('close', (code) => {
      this.isConnected = false;
      this.isAuthenticated = false;
      console.warn(`🔌 [HA-Client] Socket cerrado (${code}). Reconectando en 5s...`);
      this.emit('connection_status', { connected: false });
      this.reconnectTimeout = setTimeout(() => this.connectWs(), 5000);
    });

    this.ws.on('error', (err) => {
      console.error('❌ [HA-Client] Error WS:', err.message);
    });
  }

  async handleMessage(msg) {
    if (msg.type === 'auth_required') {
      this.send({ type: 'auth', access_token: config.token });
      return;
    }

    if (msg.type === 'auth_ok') {
      this.isAuthenticated = true;
      this.isConnected = true;
      console.log('✅ [HA-Client] Autenticado exitosamente.');

      // 1. Cargar Device Registry, Entity Registry y Estados iniciales
      await this.syncRegistries();

      // 2. Suscribirse a eventos de cambio de estado en vivo
      this.send({
        id: this.messageId++,
        type: 'subscribe_events',
        event_type: 'state_changed',
      });

      this.emit('connection_status', { connected: true });
      return;
    }

    if (msg.type === 'auth_invalid') {
      console.error('❌ [HA-Client] Token inválido:', msg.message);
      this.ws.close();
      return;
    }

    // Respuestas de comandos con ID
    if (msg.id && this.pendingCallbacks.has(msg.id)) {
      const cb = this.pendingCallbacks.get(msg.id);
      this.pendingCallbacks.delete(msg.id);
      cb(msg);
      return;
    }

    // Eventos en vivo
    if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
      const { entity_id, new_state } = msg.event.data;
      if (new_state) {
        this.states.set(entity_id, new_state);
      } else {
        this.states.delete(entity_id);
      }

      this.emit('state_changed', {
        entity_id,
        new_state,
      });
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  callWsCommand(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      const timer = setTimeout(() => {
        this.pendingCallbacks.delete(id);
        reject(new Error(`Timeout en comando WS: ${type}`));
      }, 10000);

      this.pendingCallbacks.set(id, (res) => {
        clearTimeout(timer);
        if (res.success) resolve(res.result);
        else reject(new Error(res.error?.message || 'Error en comando WS'));
      });

      this.send({ id, type, ...payload });
    });
  }

  async syncRegistries() {
    try {
      console.log('🔄 [HA-Client] Sincronizando catálogo oficial de dispositivos y entidades...');
      
      const [devices, entities, states] = await Promise.all([
        this.callWsCommand('config/device_registry/list'),
        this.callWsCommand('config/entity_registry/list'),
        fetch(`${config.haUrl}/api/states`, {
          headers: { 'Authorization': `Bearer ${config.token}`, 'Content-Type': 'application/json' },
        }).then(r => r.json()),
      ]);

      // Guardar dispositivos
      this.deviceRegistry.clear();
      for (const d of devices) {
        this.deviceRegistry.set(d.id, d);
      }

      // Guardar registro de entidades (con disabled_by y device_id)
      this.entityRegistry.clear();
      for (const e of entities) {
        this.entityRegistry.set(e.entity_id, e);
      }

      // Guardar estados actuales
      this.states.clear();
      for (const s of states) {
        this.states.set(s.entity_id, s);
      }

      console.log(`✅ [HA-Client] Sincronizado: ${devices.length} dispositivos y ${entities.length} entidades registradas.`);
      this.emit('registries_synced');
    } catch (err) {
      console.error('❌ [HA-Client] Error sincronizando registros:', err.message);
    }
  }

  async callService(domain, service, serviceData = {}) {
    try {
      const url = `${config.haUrl}/api/services/${domain}/${service}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const result = await res.json();
      return { success: true, result };
    } catch (err) {
      console.error(`❌ [HA-Client] Error servicio ${domain}.${service}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

export const haClient = new HomeAssistantClient();
