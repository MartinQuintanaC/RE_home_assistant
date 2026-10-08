import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { haClient } from './ha-client.js';
import { eventProcessor } from './event-processor.js';
<<<<<<< HEAD
import { opentraxxClient } from './opentraxx-client.js';
=======
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af

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

<<<<<<< HEAD
// Eventos de cambio de estado en vivo de Home Assistant
=======
// Eventos de cambio de estado en vivo
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af
haClient.on('state_changed', (evt) => {
  eventProcessor.updateEntityState(evt.entity_id, evt.new_state);
});

<<<<<<< HEAD
// Reenviar al navegador cuando cambie una entidad de algún dispositivo de Home Assistant
=======
// Reenviar al navegador cuando cambie una entidad de algún dispositivo
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af
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

<<<<<<< HEAD
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
=======
// --- ENDPOINTS ---

// 1. Obtener todos los dispositivos con sus entidades habilitadas
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af
app.get('/api/devices', (req, res) => {
  res.json({
    connected: haClient.isConnected,
    ...eventProcessor.getSnapshot(),
  });
});

<<<<<<< HEAD
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

// 3b. Obtener información y streaming de video de una cámara MDVR
app.get('/api/opentraxx/video/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const channel = parseInt(req.query.channel, 10) || 1;
  const videoInfo = await opentraxxClient.getVideoStreamInfo(deviceId, channel);
  res.json(videoInfo);
});

// 4. Stream en tiempo real vía Server-Sent Events (SSE)
=======
// 2. Stream en tiempo real vía Server-Sent Events (SSE)
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

<<<<<<< HEAD
  // Enviar snapshots iniciales de ambos mundos (Home Assistant y OpenTraxx)
  res.write(`data: ${JSON.stringify({ type: 'DEVICES_SNAPSHOT', data: eventProcessor.getSnapshot() })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'OPENTRAXX_SNAPSHOT', data: opentraxxClient.getSnapshot() })}\n\n`);

=======
  // Enviar snapshot inicial de dispositivos
  res.write(`data: ${JSON.stringify({ type: 'DEVICES_SNAPSHOT', data: eventProcessor.getSnapshot() })}\n\n`);
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af
  sseClients.add(res);
  console.log(`👤 [SSE] Cliente web conectado. Activos: ${sseClients.size}`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`👋 [SSE] Cliente desconectado. Activos: ${sseClients.size}`);
  });
});

<<<<<<< HEAD
// 5. Forzar re-sincronización con Home Assistant
=======
// 3. Forzar re-sincronización con Home Assistant (útil si habilitaron una entidad en la app)
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af
app.post('/api/sync', async (req, res) => {
  console.log('🔄 Sincronizando registros a petición del usuario...');
  await haClient.syncRegistries();
  res.json({ success: true, snapshot: eventProcessor.getSnapshot() });
});

<<<<<<< HEAD
// 6. Control de servicios genéricos de Home Assistant
=======
// 4. Control de servicios genéricos (para botones o controles en el dashboard)
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af
app.post('/api/services/:domain/:service', async (req, res) => {
  const { domain, service } = req.params;
  const result = await haClient.callService(domain, service, req.body || {});
  res.json(result);
});

app.listen(PORT, () => {
<<<<<<< HEAD
  console.log('='.repeat(65));
  console.log(`🚀 Hub Unificado (Home Assistant + OpenTraxx) activo:`);
  console.log(`💻 En tu PC:     http://localhost:${PORT}`);
  console.log(`📱 En tu móvil:  http://192.168.18.12:${PORT}`);
  console.log('='.repeat(65));
=======
  console.log('='.repeat(55));
  console.log(`🚀 Hub por Dispositivos activo en http://localhost:${PORT}`);
  console.log(`📱 En tu móvil: http://192.168.18.12:${PORT}`);
  console.log('='.repeat(55));
>>>>>>> 3be55f0384d48463f03232205ae3059a149191af
});
