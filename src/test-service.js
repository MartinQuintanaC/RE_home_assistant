import { config } from './config.js';

async function testServiceCall() {
  console.log('='.repeat(55));
  console.log('🎮 [PRUEBA DE SERVICIO] Control de Dispositivo');
  console.log('='.repeat(55));

  // Ejemplo: Consultar el estado del Roku
  const entityId = 'media_player.recmara_roku_streaming_stick_4k';
  console.log(`📡 Consultando estado actual de: ${entityId}...`);

  try {
    const res = await fetch(`${config.haUrl}/api/states/${entityId}`, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`⚠️ No se encontró la entidad ${entityId}. Comprueba el ID.`);
      return;
    }

    const stateData = await res.json();
    console.log(`✅ Estado actual: "${stateData.state}"`);
    console.log(`   Volumen: ${stateData.attributes?.volume_level ?? 'N/A'}`);
    console.log(`   Mute: ${stateData.attributes?.is_volume_muted ?? 'N/A'}`);
    console.log(`   Fuente / App: ${stateData.attributes?.source ?? 'N/A'}`);
    console.log('');

    console.log('💡 Para enviar un comando a este dispositivo:');
    console.log('   - Reproducir/Pausar: POST /api/services/media_player/media_play_pause');
    console.log('   - Subir volumen:    POST /api/services/media_player/volume_up');
    console.log('   - Bajar volumen:    POST /api/services/media_player/volume_down');
    console.log('');
    console.log('El Hub en Node (src/server.js) ya tiene habilitada esta función en:');
    console.log(`   POST http://localhost:4000/api/services/media_player/media_play_pause`);
    console.log(`   Body: { "entity_id": "${entityId}" }`);

  } catch (err) {
    console.error('❌ Error al probar el servicio:', err.message);
  }
}

testServiceCall();
