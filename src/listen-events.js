import WebSocket from 'ws';
import { config } from './config.js';

function startListening() {
  console.log('='.repeat(55));
  console.log('⚡ [PASO 4] Escucha en Tiempo Real vía WebSocket');
  console.log('='.repeat(55));

  if (!config.token) {
    console.error('❌ Error: Debes configurar HA_TOKEN en .env antes de conectar.');
    process.exit(1);
  }

  console.log(`🔌 Conectando a ${config.haWsUrl}...`);
  const ws = new WebSocket(config.haWsUrl);
  let messageId = 1;

  ws.on('open', () => {
    console.log('🌐 Socket abierto. Esperando desafío de autenticación...');
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      // 1. Desafío de autenticación
      if (message.type === 'auth_required') {
        console.log(`🔐 Servidor solicitó autenticación (HA v${message.ha_version}). Enviando token...`);
        ws.send(JSON.stringify({
          type: 'auth',
          access_token: config.token,
        }));
      }

      // 2. Autenticación exitosa
      else if (message.type === 'auth_ok') {
        console.log('✅ ¡Autenticado exitosamente vía WebSocket!');
        console.log('📡 Suscribiéndose a todos los eventos "state_changed"...');
        
        ws.send(JSON.stringify({
          id: messageId++,
          type: 'subscribe_events',
          event_type: 'state_changed',
        }));
      }

      // 3. Autenticación fallida
      else if (message.type === 'auth_invalid') {
        console.error('❌ Error de autenticación WebSocket:', message.message);
        ws.close();
      }

      // 4. Confirmación de suscripción
      else if (message.type === 'result' && message.success) {
        console.log('👂 ¡Suscripción activa! Esperando cambios de estado en tiempo real...');
        console.log('   (Presiona Ctrl+C para detener)');
        console.log('-'.repeat(55));
      }

      // 5. Evento de cambio de estado en vivo
      else if (message.type === 'event' && message.event?.event_type === 'state_changed') {
        const { entity_id, old_state, new_state } = message.event.data;
        const oldVal = old_state ? old_state.state : '(ninguno)';
        const newVal = new_state ? new_state.state : '(eliminado)';
        const friendlyName = new_state?.attributes?.friendly_name || entity_id;
        const timestamp = new Date().toLocaleTimeString();

        console.log(`[${timestamp}] 🔄 Cambio detectado:`);
        console.log(`   Dispositivo: ${friendlyName} (${entity_id})`);
        console.log(`   Estado: "${oldVal}" ➡️ "${newVal}"`);
        if (new_state?.attributes?.unit_of_measurement) {
          console.log(`   Unidad: ${new_state.attributes.unit_of_measurement}`);
        }
        console.log('');
      }
    } catch (err) {
      console.error('⚠️  Error procesando mensaje:', err.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Conexión cerrada (Código: ${code}, Razón: ${reason || 'ninguna'})`);
  });

  ws.on('error', (err) => {
    console.error('❌ Error de WebSocket:', err.message);
  });
}

startListening();
