import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const HA_URL = process.env.HA_URL || 'http://localhost:3000';
const HA_TOKEN = process.env.HA_TOKEN || '';

const OPENTRAXX_URL = process.env.OPENTRAXX_URL || 'https://opentraxx.cl';
const OPENTRAXX_ACCOUNT = process.env.OPENTRAXX_ACCOUNT || '';
const OPENTRAXX_PASSWORD = process.env.OPENTRAXX_PASSWORD || '';

// Construir la URL WebSocket a partir de la URL HTTP
const getWsUrl = (baseUrl) => {
  const url = new URL(baseUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/api/websocket`;
};

export const config = {
  haUrl: HA_URL.replace(/\/$/, ''),
  haWsUrl: getWsUrl(HA_URL),
  token: HA_TOKEN.trim(),

  // Configuración OpenTraxx (808GPS)
  opentraxxUrl: OPENTRAXX_URL.replace(/\/$/, ''),
  opentraxxAccount: OPENTRAXX_ACCOUNT.trim(),
  opentraxxPassword: OPENTRAXX_PASSWORD.trim(),
};
