import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fetchAllStates() {
  console.log('='.repeat(55));
  console.log('📊 [PASO 3] Extracción de Estados de Entidades de Home Assistant');
  console.log('='.repeat(55));

  if (!config.token) {
    console.error('❌ Error: Debes configurar HA_TOKEN en el archivo .env antes de extraer datos.');
    process.exit(1);
  }

  try {
    console.log(`📡 Consultando ${config.haUrl}/api/states...`);
    const res = await fetch(`${config.haUrl}/api/states`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const states = await res.json();
    console.log(`✅ ¡Recibidas ${states.length} entidades de Home Assistant!`);
    console.log('');

    // Agrupar por dominio de forma genérica (sensor, media_player, switch, light, etc.)
    const byDomain = {};
    for (const item of states) {
      const domain = item.entity_id.split('.')[0];
      if (!byDomain[domain]) {
        byDomain[domain] = [];
      }
      byDomain[domain].push(item);
    }

    console.log('📋 Resumen por dominio de entidad:');
    console.log('-'.repeat(45));
    for (const [domain, list] of Object.entries(byDomain)) {
      console.log(` • [${domain}] -> ${list.length} entidad(es)`);
    }
    console.log('-'.repeat(45));
    console.log('');

    // Guardar volcado completo a data/entities_dump.json para inspección
    const dataDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dumpPath = path.join(dataDir, 'entities_dump.json');
    fs.writeFileSync(dumpPath, JSON.stringify(states, null, 2), 'utf-8');
    console.log(`💾 Volcado completo guardado en: data/entities_dump.json`);
    console.log('');

    // Vista previa de algunas entidades
    console.log('🔍 Muestra de las primeras entidades detectadas:');
    const preview = states.slice(0, 8);
    for (const item of preview) {
      const friendlyName = item.attributes?.friendly_name || item.entity_id;
      console.log(`   - ID: ${item.entity_id}`);
      console.log(`     Nombre: "${friendlyName}" | Estado: "${item.state}"`);
    }

    return states;
  } catch (error) {
    console.error('❌ Error al extraer estados:', error.message);
  }
}

fetchAllStates();
