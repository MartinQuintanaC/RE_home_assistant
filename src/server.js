import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { haClient } from './ha-client.js';
import { eventProcessor } from './event-processor.js';
import { opentraxxClient } from './opentraxx-client.js';

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

// Eventos de cambio de estado en vivo de Home Assistant
haClient.on('state_changed', (evt) => {
  eventProcessor.updateEntityState(evt.entity_id, evt.new_state);
});

// Reenviar al navegador cuando cambie una entidad de algún dispositivo de Home Assistant
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

// Sincronización inicial y periódica con OpenTraxx (cada 30s)
opentraxxClient.getVehiclesWithTelemetry().then(() => {
  broadcast({ type: 'OPENTRAXX_SNAPSHOT', data: opentraxxClient.getSnapshot() });
});

setInterval(async () => {
  await opentraxxClient.getVehiclesWithTelemetry();
  broadcast({ type: 'OPENTRAXX_SNAPSHOT', data: opentraxxClient.getSnapshot() });
}, 30000);

// --- ENDPOINTS ---

// 1. Obtener todos los dispositivos de Home Assistant
app.get('/api/devices', (req, res) => {
  res.json({
    connected: haClient.isConnected,
    ...eventProcessor.getSnapshot(),
  });
});

// 2. Obtener todos los vehículos de OpenTraxx
app.get('/api/opentraxx/vehicles', async (req, res) => {
  await opentraxxClient.getVehiclesWithTelemetry();
  res.json({
    success: true,
    ...opentraxxClient.getSnapshot(),
  });
});

// 3. Forzar re-sincronización de OpenTraxx
app.post('/api/opentraxx/sync', async (req, res) => {
  await opentraxxClient.getVehiclesWithTelemetry();
  broadcast({ type: 'OPENTRAXX_SNAPSHOT', data: opentraxxClient.getSnapshot() });
  res.json({
    success: true,
    ...opentraxxClient.getSnapshot(),
  });
});

// 4. Stream en tiempo real vía Server-Sent Events (SSE)
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Enviar snapshots iniciales de ambos mundos (Home Assistant y OpenTraxx)
  res.write(`data: ${JSON.stringify({ type: 'DEVICES_SNAPSHOT', data: eventProcessor.getSnapshot() })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'OPENTRAXX_SNAPSHOT', data: opentraxxClient.getSnapshot() })}\n\n`);

  sseClients.add(res);
  console.log(`👤 [SSE] Cliente web conectado. Activos: ${sseClients.size}`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`👋 [SSE] Cliente desconectado. Activos: ${sseClients.size}`);
  });
});

// 5. Forzar re-sincronización con Home Assistant
app.post('/api/sync', async (req, res) => {
  console.log('🔄 Sincronizando registros a petición del usuario...');
  await haClient.syncRegistries();
  res.json({ success: true, snapshot: eventProcessor.getSnapshot() });
});

// 6. Control de servicios genéricos de Home Assistant
app.post('/api/services/:domain/:service', async (req, res) => {
  const { domain, service } = req.params;
  const result = await haClient.callService(domain, service, req.body || {});
  res.json(result);
});

app.listen(PORT, () => {
  console.log('='.repeat(65));
  console.log(`🚀 Hub Unificado (Home Assistant + OpenTraxx) activo:`);
  console.log(`💻 En tu PC:     http://localhost:${PORT}`);
  console.log(`📱 En tu móvil:  http://192.168.18.12:${PORT}`);
  console.log('='.repeat(65));
});
