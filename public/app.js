let devicesList = [];

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// 1. GESTIÓN DE PESTAÑAS (LOS 2 APARTADOS)
function switchTab(tab) {
  activeTab = tab;
  const secHA = document.getElementById('section-ha');
  const secOTX = document.getElementById('section-otx');
  const btnHA = document.getElementById('tab-btn-ha');
  const btnOTX = document.getElementById('tab-btn-otx');
  const btnBoth = document.getElementById('tab-btn-both');

  // Reset clases de botones
  [btnHA, btnOTX, btnBoth].forEach(btn => {
    if (btn) {
      btn.className = 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer';
    }
  });

  if (tab === 'ha') {
    secHA.classList.remove('hidden');
    secOTX.classList.add('hidden');
    btnHA.className = 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-sky-500 text-white shadow-sm';
  } else if (tab === 'otx') {
    secHA.classList.add('hidden');
    secOTX.classList.remove('hidden');
    btnOTX.className = 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-emerald-600 text-white shadow-sm';
  } else if (tab === 'both') {
    secHA.classList.remove('hidden');
    secOTX.classList.remove('hidden');
    btnBoth.className = 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-indigo-600 text-white shadow-sm';
  }

  refreshIcons();
}

// 2. RENDERIZAR APARTADO 1: HOME ASSISTANT
const expandedDevices = new Set();

function toggleExpand(deviceId) {
  if (expandedDevices.has(deviceId)) {
    expandedDevices.delete(deviceId);
  } else {
    expandedDevices.add(deviceId);
  }
  renderDevices();
}

function renderDevices() {
  const container = document.getElementById('devices-container');
  const badgeCount = document.getElementById('badge-ha-count');
  if (!container) return;

  if (badgeCount) badgeCount.textContent = devicesList.length;

  if (devicesList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-10 text-center glass-card rounded-2xl text-slate-400">
        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        <p class="text-sm font-medium">Buscando dispositivos de Home Assistant...</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  const INITIAL_VISIBLE_COUNT = 4;

  container.innerHTML = devicesList.map((device) => {
    const isPhone = device.manufacturer?.toLowerCase().includes('vivo') || device.name?.toLowerCase().includes('v2314') || device.model?.toLowerCase().includes('v2314');
    const isRoku = device.name?.toLowerCase().includes('roku') || device.manufacturer?.toLowerCase().includes('roku');

    let deviceIcon = 'cpu';
    if (isPhone) deviceIcon = 'smartphone';
    else if (isRoku) deviceIcon = 'tv';

    const total = device.entities.length;
    const hasMore = total > INITIAL_VISIBLE_COUNT;
    const isExpanded = expandedDevices.has(device.id);

    const visibleEntities = isExpanded || !hasMore ? device.entities : device.entities.slice(0, INITIAL_VISIBLE_COUNT);
    const hiddenCount = total - INITIAL_VISIBLE_COUNT;

    return `
      <div class="glass-card rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 hover:border-slate-700" id="card-${device.id}">
        <div>
          <!-- ENCABEZADO DEL DISPOSITIVO -->
          <div class="flex items-start justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <i data-lucide="${deviceIcon}" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-slate-100 text-base leading-snug">${escapeHtml(device.name)}</h3>
                <p class="text-xs text-slate-400">
                  ${escapeHtml(device.manufacturer || 'Dispositivo')} ${device.model ? `• ${escapeHtml(device.model)}` : ''}
                </p>
              </div>
            </div>
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
              ${total} activas
            </span>
          </div>

          <!-- LISTA DE ENTIDADES HABILITADAS -->
          <div class="space-y-2">
            ${visibleEntities.map((entity) => renderEntityRow(entity)).join('')}
          </div>

          <!-- BOTÓN VER MÁS / VER MENOS -->
          ${hasMore ? `
            <div class="mt-3 text-center">
              <button 
                onclick="toggleExpand('${device.id}')" 
                class="w-full py-1.5 px-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>${isExpanded ? 'Ver menos' : `Ver más (+${hiddenCount} entidades)`}</span>
                <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- CONTROLES ADICIONALES (Para Media Players como Roku) -->
        ${renderDeviceExtraControls(device)}
      </div>
    `;
  }).join('');

  refreshIcons();
}

function renderEntityRow(entity) {
  const val = formatEntityValue(entity);
  const icon = getEntityIcon(entity);

  return `
    <div 
      id="row-${escapeHtml(entity.entity_id)}" 
      class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:bg-slate-850 transition-colors text-xs"
    >
      <div class="flex items-center gap-2.5 min-w-0 pr-2">
        <div class="text-slate-400 shrink-0">
          <i data-lucide="${icon}" class="w-4 h-4"></i>
        </div>
        <div class="truncate">
          <p class="font-medium text-slate-200 truncate">${escapeHtml(entity.name)}</p>
          <span class="text-[10px] text-slate-500 font-mono">${escapeHtml(entity.entity_id)}</span>
        </div>
      </div>

      <div class="text-right shrink-0">
        <span id="val-${escapeHtml(entity.entity_id)}" class="font-semibold ${getValueColorClass(entity)}">
          ${escapeHtml(val)}
        </span>
      </div>
    </div>
  `;
}

function renderDeviceExtraControls(device) {
  const mediaEntity = device.entities.find(e => e.domain === 'media_player');
  if (!mediaEntity) return '';

  const isPlaying = mediaEntity.state === 'playing';

  return `
    <div class="mt-4 pt-3 border-t border-slate-800/80">
      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Controles Rápidos</p>
      <div class="grid grid-cols-4 gap-2">
        <button 
          onclick="callService('media_player', 'media_play_pause', { entity_id: '${escapeHtml(mediaEntity.entity_id)}' })" 
          class="col-span-2 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-medium text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
        >
          <i data-lucide="${isPlaying ? 'pause' : 'play'}" class="w-3.5 h-3.5"></i>
          <span>${isPlaying ? 'Pausar' : 'Play / Pausa'}</span>
        </button>

        <button 
          onclick="callService('media_player', 'volume_down', { entity_id: '${escapeHtml(mediaEntity.entity_id)}' })" 
          title="Bajar Volumen" 
          class="flex items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-xs transition-all cursor-pointer"
        >
          <i data-lucide="volume-1" class="w-4 h-4"></i>
        </button>

        <button 
          onclick="callService('media_player', 'volume_up', { entity_id: '${escapeHtml(mediaEntity.entity_id)}' })" 
          title="Subir Volumen" 
          class="flex items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-xs transition-all cursor-pointer"
        >
          <i data-lucide="volume-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;
}

// 3. RENDERIZAR APARTADO 2: OPENTRAXX (808GPS)
function renderVehicles() {
  const container = document.getElementById('vehicles-container');
  const badgeCount = document.getElementById('badge-otx-count');
  const syncLabel = document.getElementById('otx-sync-time');
  if (!container) return;

  if (badgeCount) badgeCount.textContent = vehiclesList.length;

  if (vehiclesList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-10 text-center glass-card rounded-2xl text-slate-400">
        <i data-lucide="navigation" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        <p class="text-sm font-medium">Buscando flota vehicular en OpenTraxx...</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  container.innerHTML = vehiclesList.map((vehi) => {
    const isOnline = vehi.isOnline;
    const badgeClass = isOnline
      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30';

    return `
      <div class="glass-card rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 hover:border-slate-700">
        <div>
          <!-- ENCABEZADO DEL VEHÍCULO -->
          <div class="flex items-start justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <i data-lucide="car" class="w-6 h-6"></i>
              </div>
              <div>
                <h3 class="font-bold text-slate-100 text-lg leading-snug">${escapeHtml(vehi.name)}</h3>
                <p class="text-xs text-slate-400">
                  ID: ${vehi.id} • ${escapeHtml(vehi.deviceType || 'GPS')}
                </p>
              </div>
            </div>
            <span class="px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${badgeClass}">
              ${escapeHtml(vehi.statusLabel || (isOnline ? 'En línea' : 'Desconectado'))}
            </span>
          </div>

          <!-- DATOS DE TELEMETRÍA -->
          <div class="space-y-2.5">
            <!-- Dispositivo GPS -->
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs">
              <div class="flex items-center gap-2 text-slate-400">
                <i data-lucide="radio" class="w-4 h-4"></i>
                <span class="font-medium text-slate-300">ID Equipo GPS</span>
              </div>
              <span class="font-mono text-slate-100 font-semibold">${escapeHtml(vehi.deviceId)}</span>
            </div>

            <!-- Velocidad -->
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs">
              <div class="flex items-center gap-2 text-slate-400">
                <i data-lucide="gauge" class="w-4 h-4 text-sky-400"></i>
                <span class="font-medium text-slate-300">Velocidad Actual</span>
              </div>
              <span class="font-bold text-sky-400 text-sm">${escapeHtml(vehi.speed)}</span>
            </div>

            <!-- Coordenadas Geográficas -->
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs">
              <div class="flex items-center gap-2 text-slate-400">
                <i data-lucide="map-pin" class="w-4 h-4 text-emerald-400"></i>
                <span class="font-medium text-slate-300">Ubicación GPS</span>
              </div>
              <span class="font-mono text-slate-200">${escapeHtml(vehi.locationFormatted)}</span>
            </div>

            <!-- Último reporte -->
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs">
              <div class="flex items-center gap-2 text-slate-400">
                <i data-lucide="clock" class="w-4 h-4"></i>
                <span class="font-medium text-slate-300">Último Reporte</span>
              </div>
              <span class="text-slate-400">${escapeHtml(vehi.lastReport)}</span>
            </div>
          </div>
        </div>

        <!-- ACCIÓN: VER EN GOOGLE MAPS -->
        ${vehi.googleMapsUrl ? `
          <div class="mt-4 pt-3 border-t border-slate-800/80">
            <a 
              href="${escapeHtml(vehi.googleMapsUrl)}" 
              target="_blank" 
              class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
              <span>Abrir Ubicación en Google Maps</span>
            </a>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  refreshIcons();
}

// 4. FUNCIONES DE FORMATEO Y UTILIDADES
function formatEntityValue(entity) {
  const s = entity.state;
  if (s === 'unavailable' || s === 'unknown') return 'Desconocido';
  if (s === 'on') return 'Encendido';
  if (s === 'off') return 'Apagado';
  if (entity.unit) return `${s} ${entity.unit}`;
  return s;
}

function getValueColorClass(entity) {
  const s = entity.state;
  if (s === 'on' || s === 'playing' || s === 'charging') return 'text-emerald-400';
  if (s === 'paused') return 'text-amber-400';
  if (s === 'off' || s === 'idle') return 'text-slate-400';
  if (entity.unit === '%') {
    const num = parseInt(s, 10);
    if (!isNaN(num)) {
      if (num <= 20) return 'text-rose-400';
      if (num <= 50) return 'text-amber-400';
      return 'text-emerald-400 font-bold';
    }
  }
  return 'text-slate-100 font-mono';
}

function getEntityIcon(entity) {
  const lower = entity.entity_id.toLowerCase();
  if (lower.includes('battery')) return 'battery';
  if (lower.includes('bluetooth')) return 'bluetooth';
  if (lower.includes('music') || lower.includes('volume')) return 'music';
  if (lower.includes('charger')) return 'zap';
  if (entity.domain === 'media_player') return 'tv';
  if (entity.domain === 'remote') return 'radio';
  if (entity.domain === 'switch' || entity.domain === 'light') return 'power';
  return 'activity';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 5. SINCRONIZACIÓN Y SERVICIOS
async function callService(domain, service, data = {}) {
  showToast(`Ejecutando ${domain}.${service}...`);
  try {
    const res = await fetch(`/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) showToast('✅ Acción realizada');
    else showToast('⚠️ No se pudo ejecutar');
  } catch (err) {
    showToast('❌ Error de comunicación');
  }
}

async function syncCurrentTab() {
  const syncIcon = document.getElementById('sync-icon');
  if (syncIcon) syncIcon.classList.add('animate-spin');
  showToast('🔄 Sincronizando datos...');

  try {
    if (activeTab === 'otx') {
      const res = await fetch('/api/opentraxx/sync', { method: 'POST' });
      const data = await res.json();
      if (data.vehicles) {
        vehiclesList = data.vehicles;
        renderVehicles();
        showToast('✅ Flota OpenTraxx actualizada');
      }
    } else {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.snapshot?.devices) {
        devicesList = data.snapshot.devices;
        renderDevices();
        showToast('✅ Home Assistant actualizado');
      }
    }
  } catch (err) {
    showToast('❌ Error al sincronizar');
  } finally {
    if (syncIcon) syncIcon.classList.remove('animate-spin');
  }
}

// 6. TIEMPO REAL VÍA SERVER-SENT EVENTS (SSE)
function setupSSE() {
  const badge = document.getElementById('connection-badge');
  const badgeText = document.getElementById('connection-text');

  const evtSource = new EventSource('/api/events');

  evtSource.onopen = () => {
    badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm transition-all duration-300';
    badgeText.textContent = 'En Vivo';
  };

  evtSource.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);

      // Snapshot de Home Assistant
      if (payload.type === 'DEVICES_SNAPSHOT' && payload.data?.devices) {
        devicesList = payload.data.devices;
        renderDevices();
        updateSubtitle();
      }

      // Snapshot de OpenTraxx
      else if (payload.type === 'OPENTRAXX_SNAPSHOT' && payload.data?.vehicles) {
        vehiclesList = payload.data.vehicles;
        renderVehicles();
        updateSubtitle();
      }

      // Evento de cambio de estado individual (Home Assistant)
      else if (payload.type === 'ENTITY_STATE_CHANGED' && payload.entity) {
        const ent = payload.entity;
        for (const dev of devicesList) {
          const found = dev.entities.find(x => x.entity_id === ent.entity_id);
          if (found) {
            found.state = ent.state;
            found.attributes = ent.attributes;
            break;
          }
        }
        const valEl = document.getElementById(`val-${ent.entity_id}`);
        if (valEl) {
          valEl.textContent = formatEntityValue(ent);
          valEl.className = `font-semibold ${getValueColorClass(ent)}`;
        }
      }
    } catch (err) {
      console.error('Error parseando SSE:', err);
    }
  };

  evtSource.onerror = () => {
    badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60 shadow-sm transition-all duration-300';
    badgeText.textContent = 'Reconectando...';
  };
}

function updateSubtitle() {
  const subtitle = document.getElementById('header-subtitle');
  if (subtitle) {
    subtitle.textContent = `${devicesList.length} dispositivo(s) IoT • ${vehiclesList.length} vehículo(s) GPS en línea`;
  }
}

let toastTimeout;
function showToast(message) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  msgEl.textContent = message;
  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
  switchTab('ha');
  setupSSE();
});
