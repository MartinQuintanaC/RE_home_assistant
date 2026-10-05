import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { haClient } from './ha-client.js';
import { eventProcessor } from './event-processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../public')));

const sseClients = new Set();

// Sincronización cuando los registros de Home Assistant estén listos
haClient.on('registries_synced', () => {
  eventProcessor.buildDevices(haClient.deviceRegistry, haClient.entityRegistry, haClient.states);
  broadcast({ type: 'DEVICES_SNAPSHOT', data: eventProcessor.getSnapshot() });
});

// Eventos de cambio de estado en vivo
haClient.on('state_changed', (evt) => {
  eventProcessor.updateEntityState(evt.entity_id, evt.new_state);
});

// Reenviar al navegador cuando cambie una entidad de algún dispositivo
eventProcessor.on('entity_state_changed', (payload) => {
  broadcast({ type: 'ENTITY_STATE_CHANGED', ...payload });
});

function broadcast(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    client.write(msg);
  }
}

// Iniciar conexión con Home Assistant
haClient.init();

// --- ENDPOINTS ---

// 1. Obtener todos los dispositivos con sus entidades habilitadas
app.get('/api/devices', (req, res) => {
  res.json({
    connected: haClient.isConnected,
    ...eventProcessor.getSnapshot(),
  });
});

// 2. Stream en tiempo real vía Server-Sent Events (SSE)
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Enviar snapshot inicial de dispositivos
  res.write(`data: ${JSON.stringify({ type: 'DEVICES_SNAPSHOT', data: eventProcessor.getSnapshot() })}\n\n`);
  sseClients.add(res);
  console.log(`👤 [SSE] Cliente web conectado. Activos: ${sseClients.size}`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`👋 [SSE] Cliente desconectado. Activos: ${sseClients.size}`);
  });
});

// 3. Forzar re-sincronización con Home Assistant (útil si habilitaron una entidad en la app)
app.post('/api/sync', async (req, res) => {
  console.log('🔄 Sincronizando registros a petición del usuario...');
  await haClient.syncRegistries();
  res.json({ success: true, snapshot: eventProcessor.getSnapshot() });
});

// 4. Control de servicios genéricos (para botones o controles en el dashboard)
app.post('/api/services/:domain/:service', async (req, res) => {
  const { domain, service } = req.params;
  const result = await haClient.callService(domain, service, req.body || {});
  res.json(result);
});

app.listen(PORT, () => {
  console.log('='.repeat(55));
  console.log(`🚀 Hub por Dispositivos activo en http://localhost:${PORT}`);
  console.log(`📱 En tu móvil: http://192.168.18.12:${PORT}`);
  console.log('='.repeat(55));
});
