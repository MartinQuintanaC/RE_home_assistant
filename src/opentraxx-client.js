import { config } from './config.js';

class OpenTraxxClient {
  constructor() {
    this.jsession = null;
    this.vehiclesCache = [];
    this.lastSyncTime = null;
    this.isSyncing = false;
  }

  // 1. Iniciar sesión y obtener token jsession
  async login() {
    if (!config.opentraxxAccount || !config.opentraxxPassword) {
      console.warn('⚠️ [OpenTraxx] Credenciales no configuradas en .env');
      return null;
    }

    try {
      const loginUrl = `${config.opentraxxUrl}/StandardApiAction_login.action?account=${encodeURIComponent(config.opentraxxAccount)}&password=${encodeURIComponent(config.opentraxxPassword)}`;
      const res = await fetch(loginUrl, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();

      if (data.result === 0 && data.jsession) {
        this.jsession = data.jsession;
        console.log(`✅ [OpenTraxx] Autenticado exitosamente. Sesión: ${this.jsession.substring(0, 10)}...`);
        return this.jsession;
      } else {
        console.error(`❌ [OpenTraxx] Error de autenticación. Código: ${data.result}`);
        return null;
      }
    } catch (err) {
      console.error('❌ [OpenTraxx] Error al conectar:', err.message);
      return null;
    }
  }

  // Asegura que tengamos una sesión válida
  async ensureSession() {
    if (!this.jsession) {
      await this.login();
    }
    return this.jsession;
  }

  // 2. Obtener lista de vehículos con telemetría en tiempo real
  async getVehiclesWithTelemetry() {
    if (this.isSyncing) return this.vehiclesCache;
    this.isSyncing = true;

    try {
      let session = await this.ensureSession();
      if (!session) {
        this.isSyncing = false;
        return [];
      }

      // Consultar vehículos asignados a la cuenta
      let vehiUrl = `${config.opentraxxUrl}/StandardApiAction_queryUserVehicle.action?jsession=${session}`;
      let vehiRes = await fetch(vehiUrl, { headers: { 'Accept': 'application/json' } });
      let vehiData = await vehiRes.json();

      // Si la sesión expiró (código 5), reautenticar
      if (vehiData.result === 5) {
        console.log('🔄 [OpenTraxx] Sesión expirada, renovando token...');
        session = await this.login();
        if (!session) {
          this.isSyncing = false;
          return [];
        }
        vehiUrl = `${config.opentraxxUrl}/StandardApiAction_queryUserVehicle.action?jsession=${session}`;
        vehiRes = await fetch(vehiUrl, { headers: { 'Accept': 'application/json' } });
        vehiData = await vehiRes.json();
      }

      const rawVehicles = vehiData.vehicles || [];
      const detailedVehicles = [];

      for (const v of rawVehicles) {
        const deviceId = v.dl && v.dl.length > 0 ? v.dl[0].id : null;
        let statusObj = null;

        if (deviceId) {
          try {
            const sUrl = `${config.opentraxxUrl}/StandardApiAction_getDeviceStatus.action?jsession=${session}&devIdno=${deviceId}&toMap=1`;
            const sRes = await fetch(sUrl, { headers: { 'Accept': 'application/json' } });
            const sData = await sRes.json();
            if (sData.status && sData.status.length > 0) {
              statusObj = sData.status[0];
            }
          } catch (e) {
            console.warn(`⚠️ [OpenTraxx] No se pudo obtener telemetría de ${v.nm}:`, e.message);
          }
        }

        const isOnline = statusObj?.ol === 1;
        const lat = statusObj?.mlat ? parseFloat(statusObj.mlat) : null;
        const lng = statusObj?.mlng ? parseFloat(statusObj.mlng) : null;
        const speedKmh = statusObj?.sp !== undefined ? Math.round(statusObj.sp / 10) : 0;
        const lastGpsTime = statusObj?.gt || 'Sin reporte reciente';

        detailedVehicles.push({
          id: v.id,
          name: v.nm || `Vehículo #${v.id}`,
          deviceId: deviceId || 'Sin GPS',
          isOnline: isOnline,
          statusLabel: isOnline ? 'En línea' : 'Desconectado',
          speed: `${speedKmh} km/h`,
          speedNumber: speedKmh,
          coordinates: { lat, lng },
          locationFormatted: (lat && lng) ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'No disponible',
          googleMapsUrl: (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : null,
          lastReport: lastGpsTime,
          deviceType: 'GPS Vehicular / Flota',
        });
      }

      this.vehiclesCache = detailedVehicles;
      this.lastSyncTime = new Date().toLocaleTimeString();
      return this.vehiclesCache;
    } catch (err) {
      console.error('❌ [OpenTraxx] Error al extraer vehículos con telemetría:', err.message);
      return this.vehiclesCache;
    } finally {
      this.isSyncing = false;
    }
  }

  getSnapshot() {
    return {
      vehicles: this.vehiclesCache,
      count: this.vehiclesCache.length,
      lastSync: this.lastSyncTime || 'Pendiente',
    };
  }
}

export const opentraxxClient = new OpenTraxxClient();
