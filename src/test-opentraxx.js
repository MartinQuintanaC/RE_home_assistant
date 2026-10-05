import { config } from './config.js';

const ERROR_DESCRIPTIONS = {
  1: 'Cuenta o contraseña incorrecta (errAccoutOrPassword)',
  2: 'Cuenta o contraseña incorrecta (errAccoutOrPassword)',
  3: 'Usuario desactivado (errUserDeactivated)',
  4: 'Usuario expirado (errUserExpired)',
  5: 'La sesión no existe o expiró (errSessionNotExist)',
  6: 'Excepción en el servidor (errException)',
  7: 'Faltan parámetros requeridos (errRequireParam)',
  13: 'Cuenta deshabilitada / bloqueada (errAccountForb)',
  34: 'Error al iniciar sesión (login_error)',
};

async function testOpenTraxx() {
  console.log('='.repeat(65));
  console.log('🛰️  [FASE 1] Prueba de Conexión y Autenticación con OpenTraxx (808GPS)');
  console.log('='.repeat(65));
  console.log(`🔗 URL Base:   ${config.opentraxxUrl}`);
  console.log(`👤 Usuario:    ${config.opentraxxAccount || '❌ NO CONFIGURADO EN .env'}`);
  console.log(`🔑 Contraseña: ${config.opentraxxPassword ? '****** (configurada)' : '❌ NO CONFIGURADA EN .env'}`);
  console.log('');

  if (!config.opentraxxAccount || !config.opentraxxPassword) {
    console.warn('⚠️  ADVERTENCIA: Debes colocar tus credenciales en el archivo .env:');
    console.log('   OPENTRAXX_ACCOUNT=tu_usuario');
    console.log('   OPENTRAXX_PASSWORD=tu_contraseña');
    console.log('');
    return;
  }

  try {
    console.log('1️⃣  Enviando solicitud de inicio de sesión a StandardApiAction_login.action...');
    const loginUrl = `${config.opentraxxUrl}/StandardApiAction_login.action?account=${encodeURIComponent(config.opentraxxAccount)}&password=${encodeURIComponent(config.opentraxxPassword)}`;

    const loginRes = await fetch(loginUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!loginRes.ok) {
      throw new Error(`Error HTTP ${loginRes.status}: ${loginRes.statusText}`);
    }

    const loginData = await loginRes.json();
    console.log('   📥 Respuesta del servidor:', loginData);
    console.log('');

    if (loginData.result === 0) {
      const jsession = loginData.jsession;
      console.log('   ✅ ¡Autenticación exitosa!');
      console.log(`   🎫 Token de Sesión (jsession): ${jsession}`);
      console.log('');

      // 2. Probar extracción inicial de vehículos
      console.log('2️⃣  Consultando vehículos y equipos autorizados (StandardApiAction_queryUserVehicle.action)...');
      const vehiclesUrl = `${config.opentraxxUrl}/StandardApiAction_queryUserVehicle.action?jsession=${jsession}`;
      
      const vehiRes = await fetch(vehiclesUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!vehiRes.ok) {
        throw new Error(`Error HTTP al consultar vehículos: ${vehiRes.status}`);
      }

      const vehiData = await vehiRes.json();
      const vehicles = vehiData.vehicles || [];
      console.log(`   🚗 ¡Se detectaron ${vehicles.length} vehículo(s) / equipo(s) en la cuenta!`);
      console.log('');

      if (vehicles.length > 0) {
        console.log('📋 Lista de vehículos detectados:');
        for (let index = 0; index < vehicles.length; index++) {
          const v = vehicles[index];
          const deviceId = v.dl && v.dl.length > 0 ? v.dl[0].id : null;
          console.log(`   ${index + 1}. Nombre/Patente: "${v.nm}" | ID: ${v.id} | Dispositivo GPS: ${deviceId || 'Sin GPS'}`);

          if (deviceId) {
            // Consultar estado en vivo del GPS (coordenadas, velocidad, etc.)
            try {
              const statusUrl = `${config.opentraxxUrl}/StandardApiAction_getDeviceStatus.action?jsession=${jsession}&devIdno=${deviceId}&toMap=1`;
              const sRes = await fetch(statusUrl);
              const sData = await sRes.json();
              console.log('      🔍 Respuesta cruda de estado:', JSON.stringify(sData));
              if (sData.status) {
                const s = sData.status;
                const speed = s.sp !== undefined ? `${(s.sp / 10).toFixed(1)} km/h` : '0 km/h';
                const lat = s.lat ? (s.lat / 1000000).toFixed(6) : 'N/A';
                const lng = s.lng ? (s.lng / 1000000).toFixed(6) : 'N/A';
                console.log(`      📍 Telemetría GPS: Velocidad: ${speed} | Lat: ${lat}, Lng: ${lng} | Última hora: ${s.gt || 'N/A'}`);
                console.log(`      ⚡ Estado en línea: ${s.ol === 1 ? '🟢 Conectado' : '🔴 Desconectado'}`);
              } else {
                console.log('      ℹ️  Sin reporte reciente de telemetría.');
              }
            } catch (err) {
              console.log(`      ⚠️ No se pudo obtener telemetría: ${err.message}`);
            }
          }
        }
      } else {
        console.log('   ℹ️  La cuenta no tiene vehículos asignados en este momento.');
      }

      console.log('');
      console.log('🎉 ¡Fase 1 y 2 de diagnóstico completadas con éxito!');
      return { success: true, jsession, vehicles };
    } else {
      const desc = ERROR_DESCRIPTIONS[loginData.result] || 'Error desconocido';
      console.error(`   ❌ Error de autenticación (Código ${loginData.result}): ${desc}`);
      return { success: false, error: desc };
    }
  } catch (error) {
    console.error('❌ Error de comunicación con OpenTraxx:', error.message);
    return { success: false, error: error.message };
  }
}

testOpenTraxx();
