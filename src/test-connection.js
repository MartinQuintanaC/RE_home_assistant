import { config } from './config.js';

async function testConnection() {
  console.log('='.repeat(55));
  console.log('📡 [PASO 2] Probando Conexión con Home Assistant');
  console.log('='.repeat(55));
  console.log(`🔗 URL Base: ${config.haUrl}`);
  console.log(`🔑 Token configurado: ${config.token ? `${config.token.substring(0, 10)}... (longitud: ${config.token.length})` : '❌ NO CONFIGURADO'}`);
  console.log('');

  if (!config.token) {
    console.warn('⚠️  ADVERTENCIA: No has colocado tu Token en el archivo .env');
    console.log('ℹ️  Para obtenerlo:');
    console.log('   1. Abre Home Assistant en tu navegador (ej. http://localhost:3000)');
    console.log('   2. Ve a tu Perfil de usuario (clic en tu nombre abajo a la izquierda)');
    console.log('   3. Baja hasta "Tokens de acceso de larga duración" (Long-Lived Access Tokens)');
    console.log('   4. Crea uno nuevo, cópialo y pégalo en el archivo .env como HA_TOKEN=...');
    console.log('');
  }

  // 1. Probar conectividad HTTP básica
  console.log('1️⃣  Comprobando si el servidor Home Assistant responde en la red...');
  try {
    const res = await fetch(`${config.haUrl}/api/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 200) {
      const data = await res.json();
      console.log('   ✅ Conexión exitosa y Token VÁLIDO!');
      console.log(`   📝 Respuesta del servidor:`, data);
      console.log('');
      console.log('🎉 ¡Autenticación completada con éxito!');
      return true;
    } else if (res.status === 401) {
      console.error('   ❌ Error 401: No autorizado.');
      console.error('   👉 El servidor Home Assistant está activo, pero el Token es incorrecto o está vacío.');
      return false;
    } else {
      console.error(`   ⚠️  Respuesta inesperada con código HTTP ${res.status}: ${res.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error al intentar conectar con el servidor:');
    console.error(`   ${error.message}`);
    console.log('');
    console.log('💡 Sugerencias de diagnóstico:');
    console.log('   - Verifica que el contenedor Docker de Home Assistant esté corriendo.');
    console.log('   - Si localhost:3000 no responde, prueba cambiando HA_URL a http://192.168.18.12:3000 en .env.');
    return false;
  }
}

testConnection();
