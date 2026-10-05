import { EventEmitter } from 'events';

/**
 * EventProcessor Universal:
 * Agrupa todas las entidades estrictamente por su DISPOSITIVO físico (device_id),
 * mostrando únicamente las entidades que estén en estado HABILITADO (disabled_by === null).
 * Si alguien habilita una entidad en Home Assistant (ej. Volume level music, Accent color, etc.),
 * aparece automáticamente en el apartado de su dispositivo.
 */
class EventProcessor extends EventEmitter {
  constructor() {
    super();
    this.devicesMap = new Map(); // device_id -> { id, name, model, manufacturer, entities: [] }
    this.entityToDevice = new Map(); // entity_id -> device_id
  }

  // Construye la jerarquía oficial: Dispositivo -> Entidades Habilitadas
  buildDevices(deviceRegistry, entityRegistry, states) {
    this.devicesMap.clear();
    this.entityToDevice.clear();

    // 1. Inicializar dispositivos
    for (const [devId, dev] of deviceRegistry.entries()) {
      // Ignorar dispositivos del sistema internos si no son de usuario (ej. sun o backup)
      if (dev.name === 'Sun' || dev.name === 'Backup' || dev.name === 'Google Translate en com') {
        continue;
      }

      this.devicesMap.set(devId, {
        id: devId,
        name: dev.name_by_user || dev.name || 'Dispositivo',
        model: dev.model || '',
        manufacturer: dev.manufacturer || '',
        entities: [],
      });
    }

    // 2. Asociar entidades habilitadas
    for (const [entityId, entry] of entityRegistry.entries()) {
      // Verificar si la entidad está HABILITADA (disabled_by == null)
      if (entry.disabled_by !== null && entry.disabled_by !== undefined) {
        continue; // Está deshabilitada (icono de ojo tachado en HA)
      }

      const devId = entry.device_id;
      if (!devId || !this.devicesMap.has(devId)) {
        continue;
      }

      this.entityToDevice.set(entityId, devId);

      const stateObj = states.get(entityId) || { state: 'unavailable', attributes: {} };
      const formattedEntity = this.formatEntity(entityId, entry, stateObj);

      const device = this.devicesMap.get(devId);
      device.entities.push(formattedEntity);
    }

    // Filtrar dispositivos que no tengan ninguna entidad habilitada
    const activeDevices = Array.from(this.devicesMap.values()).filter(d => d.entities.length > 0);

    console.log(`🧠 [Dispositivos Activos] ${activeDevices.length} apartados de dispositivos listos:`);
    for (const d of activeDevices) {
      console.log(`   📱 [${d.name}] (${d.manufacturer} ${d.model}) -> ${d.entities.length} entidades habilitadas`);
    }

    this.emit('devices_updated', this.getSnapshot());
  }

  formatEntity(entityId, registryEntry, stateObj) {
    const domain = entityId.split('.')[0];
    const attrs = stateObj.attributes || {};
    const friendlyName = registryEntry?.name || registryEntry?.original_name || attrs.friendly_name || entityId;

    return {
      entity_id: entityId,
      domain,
      name: friendlyName,
      state: stateObj.state,
      unit: attrs.unit_of_measurement || '',
      device_class: attrs.device_class || '',
      icon: this.detectIcon(entityId, domain, attrs),
      attributes: attrs,
    };
  }

  detectIcon(entityId, domain, attrs) {
    const lower = entityId.toLowerCase();
    if (lower.includes('battery')) return 'battery';
    if (lower.includes('bluetooth')) return 'bluetooth';
    if (lower.includes('music') || lower.includes('volume')) return 'music';
    if (lower.includes('charger')) return 'plug';
    if (domain === 'media_player') return 'tv';
    if (domain === 'remote') return 'radio';
    if (domain === 'switch' || domain === 'light') return 'power';
    if (domain === 'binary_sensor') return 'check-circle';
    return 'activity';
  }

  // Actualiza una entidad cuando cambia en vivo
  updateEntityState(entityId, newState) {
    const devId = this.entityToDevice.get(entityId);
    if (!devId || !this.devicesMap.has(devId)) return null;

    const device = this.devicesMap.get(devId);
    const entity = device.entities.find(e => e.entity_id === entityId);
    if (!entity) return null;

    entity.state = newState ? newState.state : 'unavailable';
    entity.attributes = newState ? newState.attributes : {};

    const payload = {
      device_id: devId,
      entity: entity,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.emit('entity_state_changed', payload);
    return payload;
  }

  getSnapshot() {
    return {
      devices: Array.from(this.devicesMap.values()).filter(d => d.entities.length > 0),
      timestamp: new Date().toLocaleTimeString(),
    };
  }
}

export const eventProcessor = new EventProcessor();
