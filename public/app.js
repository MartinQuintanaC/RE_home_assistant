let devicesList = [];
let vehiclesList = [];
let activeTab = 'ha';
let opentraxxSession = '';
const expandedDevices = new Set();
const expandedVehicles = new Set();
const vehicleChannelFilters = new Map();
const forcedCameraStreams = new Set();

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Helpers de OpenTraxx y Cámaras
async function ensureOpenTraxxSession() {
  if (opentraxxSession) return opentraxxSession;
  try {
    const res = await fetch('/api/opentraxx/snapshot');
    const data = await res.json();
    if (data.jsession) {
      opentraxxSession = data.jsession;
    }
  } catch (e) {
    console.warn('⚠️ No se pudo obtener sesión de OpenTraxx:', e);
  }
  return opentraxxSession;
}

async function toggleExpandVehicle(deviceId) {
  if (expandedVehicles.has(deviceId)) {
    expandedVehicles.delete(deviceId);
  } else {
    expandedVehicles.add(deviceId);
    await ensureOpenTraxxSession();
  }
  renderVehicles();
}

function setVehicleChannelFilter(deviceId, filter) {
  vehicleChannelFilters.set(deviceId, filter);
  renderVehicles();
}

function reloadSingleCamera(deviceId, channel) {
  const iframe = document.getElementById(`iframe-${deviceId}-${channel}`);
  if (iframe) {
    showToast(`🔄 Refrescando Cámara ${channel} (Sin delay)...`);
    const src = iframe.src;
    iframe.src = 'about:blank';
    setTimeout(() => {
      iframe.src = src;
    }, 200);
  }
}

function forceConnectCamera(deviceId, channel) {
  forcedCameraStreams.add(`${deviceId}-${channel}`);
  renderVehicles();
}

// 1. GESTIÓN DE PESTAÑAS (LOS 2 APARTADOS)
function switchTab(tab) {
  activeTab = tab;
  const secHA = document.getElementById('section-ha');
  const secOTX = document.getElementById('section-otx');
  const btnHA = document.getElementById('tab-btn-ha');
  const btnOTX = document.getElementById('tab-btn-otx');
  const btnBoth = document.getElementById('tab-btn-both');

  const baseInactive = 'flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer min-w-0';
  const baseActive = 'flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer min-w-0 shadow-sm text-white';

  if (btnHA) btnHA.className = baseInactive;
  if (btnOTX) btnOTX.className = baseInactive;
  if (btnBoth) btnBoth.className = 'col-span-2 hidden md:flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer';

  if (tab === 'ha') {
    secHA.classList.remove('hidden');
    secOTX.classList.add('hidden');
    if (btnHA) btnHA.className = `${baseActive} bg-sky-500`;
  } else if (tab === 'otx') {
    secHA.classList.add('hidden');
    secOTX.classList.remove('hidden');
    if (btnOTX) btnOTX.className = `${baseActive} bg-emerald-600`;
    ensureOpenTraxxSession();
    if (vehiclesList.length === 0) {
      fetch('/api/opentraxx/vehicles')
        .then(r => r.json())
        .then(d => {
          if (d.vehicles) {
            vehiclesList = d.vehicles;
            if (d.jsession) opentraxxSession = d.jsession;
            renderVehicles();
          }
        })
        .catch(() => {});
    }
  } else if (tab === 'both') {
    secHA.classList.remove('hidden');
    secOTX.classList.remove('hidden');
    if (btnBoth) btnBoth.className = 'col-span-2 hidden md:flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-indigo-600 text-white shadow-sm';
    ensureOpenTraxxSession();
  }

  refreshIcons();
}

// 2. RENDERIZAR APARTADO 1: HOME ASSISTANT
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
      <div class="glass-card rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl flex flex-col justify-between transition-all duration-300 hover:border-slate-700 min-w-0 overflow-hidden" id="card-${device.id}">
        <div>
          <!-- ENCABEZADO DEL DISPOSITIVO -->
          <div class="flex items-start justify-between mb-3 sm:mb-4 border-b border-slate-800/80 pb-3 gap-2">
            <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div class="p-2 sm:p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                <i data-lucide="${deviceIcon}" class="w-4 h-4 sm:w-5 sm:h-5"></i>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-slate-100 text-sm sm:text-base leading-snug truncate">${escapeHtml(device.name)}</h3>
                <p class="text-[11px] sm:text-xs text-slate-400 truncate">
                  ${escapeHtml(device.manufacturer || 'Dispositivo')} ${device.model ? `• ${escapeHtml(device.model)}` : ''}
                </p>
              </div>
            </div>
            <span class="shrink-0 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
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
      class="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:bg-slate-850 transition-colors text-xs gap-2 min-w-0"
    >
      <div class="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <div class="text-slate-400 shrink-0">
          <i data-lucide="${icon}" class="w-4 h-4"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-medium text-slate-200 truncate">${escapeHtml(entity.name)}</p>
          <span class="text-[10px] text-slate-500 font-mono truncate block">${escapeHtml(entity.entity_id)}</span>
        </div>
      </div>

      <div class="text-right shrink-0 max-w-[45%]">
        <span id="val-${escapeHtml(entity.entity_id)}" class="font-semibold ${getValueColorClass(entity)} truncate block text-[11px] sm:text-xs">
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

// 3. RENDERIZAR APARTADO 2: OPENTRAXX (808GPS) - FORMATO DESPLEGABLE EN GRANDE
function renderVehicles() {
  const container = document.getElementById('vehicles-container');
  const badgeCount = document.getElementById('badge-otx-count');
  if (!container) return;

  if (badgeCount) badgeCount.textContent = vehiclesList.length;

  if (vehiclesList.length === 0) {
    container.innerHTML = `
      <div class="p-10 text-center glass-card rounded-2xl text-slate-400">
        <i data-lucide="navigation" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        <p class="text-sm font-medium">Buscando flota vehicular en OpenTraxx...</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  container.innerHTML = vehiclesList.map((vehi) => {
    const isOnline = vehi.isOnline;
    const isExpanded = expandedVehicles.has(vehi.deviceId);
    const badgeClass = isOnline
      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30';

    const currentFilter = vehicleChannelFilters.get(vehi.deviceId) || 'all';
    const channelCount = vehi.channelCount || (vehi.hasVideo ? 1 : 0);

    // Determinar qué canales renderizar
    let channelsToRender = [];
    if (channelCount > 0) {
      if (currentFilter === 'all') {
        for (let i = 1; i <= channelCount; i++) channelsToRender.push(i);
      } else {
        const parsed = parseInt(currentFilter, 10);
        if (parsed >= 1 && parsed <= channelCount) channelsToRender.push(parsed);
        else for (let i = 1; i <= channelCount; i++) channelsToRender.push(i);
      }
    }

    return `
      <div class="glass-card rounded-2xl overflow-hidden border border-slate-800/80 shadow-xl transition-all duration-300 hover:border-slate-700/80 w-full" id="vehi-card-${vehi.deviceId}">
        <!-- ENCABEZADO DESPLEGABLE DEL VEHÍCULO (Clickable) -->
        <div 
          onclick="toggleExpandVehicle('${vehi.deviceId}')"
          class="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-slate-800/30 gap-3"
          title="Haz clic para ${isExpanded ? 'contraer' : 'desplegar cámaras de este vehículo'}"
        >
          <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div class="p-2.5 sm:p-3 rounded-xl ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700/60'} shrink-0">
              <i data-lucide="car" class="w-5 h-5 sm:w-6 sm:h-6"></i>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-slate-100 text-base sm:text-lg leading-snug truncate">${escapeHtml(vehi.name)}</h3>
                <span class="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full uppercase tracking-wider ${badgeClass}">
                  ${escapeHtml(vehi.statusLabel || (isOnline ? 'En línea' : 'Desconectado'))}
                </span>
              </div>
              <p class="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
                ID GPS: <span class="font-mono text-slate-300 font-medium">${escapeHtml(vehi.deviceId)}</span>
                ${channelCount > 0 ? ` • <span class="text-indigo-400 font-semibold">${channelCount} Cámaras</span>` : ''}
                ${isOnline ? ` • <span class="text-sky-400 font-medium">${escapeHtml(vehi.speed)}</span>` : ''}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="hidden sm:inline-block text-xs font-medium text-slate-400">
              ${isExpanded ? 'Contraer' : 'Ver cámaras'}
            </span>
            <div class="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-slate-700 text-white' : ''}">
              <i data-lucide="chevron-down" class="w-4 h-4"></i>
            </div>
          </div>
        </div>

        <!-- CONTENIDO EXPANDIBLE -->
        ${isExpanded ? `
          <div class="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-slate-800/80 space-y-4">
            
            <!-- BARRA DE TELEMETRÍA COMPACTA -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <!-- Velocidad -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs">
                <div class="flex items-center gap-2 text-slate-400 shrink-0">
                  <i data-lucide="gauge" class="w-4 h-4 text-sky-400"></i>
                  <span class="font-medium text-slate-300">Velocidad</span>
                </div>
                <span class="font-bold text-sky-400">${escapeHtml(vehi.speed)}</span>
              </div>

              <!-- Ubicación GPS -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs">
                <div class="flex items-center gap-2 text-slate-400 shrink-0">
                  <i data-lucide="map-pin" class="w-4 h-4 text-emerald-400"></i>
                  <span class="font-medium text-slate-300">GPS</span>
                </div>
                ${vehi.googleMapsUrl ? `
                  <a href="${escapeHtml(vehi.googleMapsUrl)}" target="_blank" class="font-mono text-emerald-400 hover:underline truncate max-w-[55%] text-right" title="Abrir en Google Maps">
                    ${escapeHtml(vehi.locationFormatted)}
                  </a>
                ` : `
                  <span class="font-mono text-slate-300 truncate">${escapeHtml(vehi.locationFormatted)}</span>
                `}
              </div>

              <!-- Último reporte -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs">
                <div class="flex items-center gap-2 text-slate-400 shrink-0">
                  <i data-lucide="clock" class="w-4 h-4 text-slate-400"></i>
                  <span class="font-medium text-slate-300">Reporte</span>
                </div>
                <span class="text-slate-400 font-mono text-[11px] truncate max-w-[55%] text-right">${escapeHtml(vehi.lastReport)}</span>
              </div>
            </div>

            <!-- FILTRO DE CANALES SI HAY MÁS DE 1 CÁMARA -->
            ${channelCount > 1 ? `
              <div class="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                <span class="text-xs font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1.5">
                  <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                  <span>Vista:</span>
                </span>
                <button 
                  onclick="setVehicleChannelFilter('${vehi.deviceId}', 'all')" 
                  class="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${currentFilter === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700'}"
                >
                  Todas las Cámaras (${channelCount})
                </button>
                ${Array.from({ length: channelCount }, (_, idx) => idx + 1).map((ch) => {
                  const isActive = String(currentFilter) === String(ch);
                  const chLabel = (vehi.channelNames && vehi.channelNames[ch - 1]) || `CH${ch}`;
                  return `
                    <button 
                      onclick="setVehicleChannelFilter('${vehi.deviceId}', '${ch}')" 
                      class="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700'}"
                    >
                      ${escapeHtml(chLabel)}
                    </button>
                  `;
                }).join('')}
              </div>
            ` : ''}

            <!-- CÁMARAS APILADAS EN GRANDE (Full width, cada cámara en su recuadro grande) -->
            ${channelCount > 0 ? `
              <div class="space-y-4 pt-1">
                ${channelsToRender.map((ch) => renderSingleLargeCamera(vehi, ch)).join('')}
              </div>
            ` : `
              <div class="p-6 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 text-slate-400">
                <i data-lucide="video-off" class="w-6 h-6 mx-auto mb-2 opacity-50"></i>
                <p class="text-xs font-medium">Este vehículo no cuenta con canales de video MDVR asociados.</p>
              </div>
            `}

          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  refreshIcons();
}

function renderSingleLargeCamera(vehi, ch) {
  const isOnline = vehi.isOnline;
  const isForced = forcedCameraStreams.has(`${vehi.deviceId}-${ch}`);
  const chName = (vehi.channelNames && vehi.channelNames[ch - 1]) || `Cámara ${ch} (CH${ch})`;
  const streamSrc = opentraxxSession
    ? `https://opentraxx.cl/808gps/open/player/video.html?devIdno=${encodeURIComponent(vehi.deviceId)}&jsession=${encodeURIComponent(opentraxxSession)}&index=${ch}&stream=1&lang=es`
    : '';

  return `
    <div class="rounded-2xl bg-slate-900/95 border border-slate-800/90 overflow-hidden shadow-2xl">
      <!-- Barra superior de la cámara individual -->
      <div class="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 bg-slate-900 border-b border-slate-800/80 gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
            <i data-lucide="video" class="w-4 h-4"></i>
          </div>
          <span class="font-bold text-slate-200 text-xs sm:text-sm truncate">${escapeHtml(chName)}</span>
          <span class="text-[10px] font-mono text-slate-500">CH${ch}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full ${isOnline ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-slate-800 text-slate-400 border border-slate-700'} flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}"></span>
            <span>${isOnline ? 'En Vivo' : 'Offline'}</span>
          </span>
          <button 
            onclick="event.stopPropagation(); reloadSingleCamera('${vehi.deviceId}', ${ch})" 
            class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition-all text-xs cursor-pointer flex items-center gap-1" 
            title="Refrescar transmisión en vivo"
          >
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            <span class="hidden sm:inline text-[11px]">Refrescar</span>
          </button>
        </div>
      </div>

      <!-- Contenedor del reproductor (Aspect Ratio 16:9, grande, ocupando todo el ancho) -->
      <div class="relative w-full aspect-video bg-black overflow-hidden select-none">
        ${isOnline || isForced ? `
          ${streamSrc ? `
            <iframe 
              id="iframe-${vehi.deviceId}-${ch}" 
              src="${escapeHtml(streamSrc)}" 
              class="w-full h-full border-0 bg-black block" 
              loading="lazy" 
              allow="autoplay; fullscreen"
            ></iframe>
          ` : `
            <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-400">
              <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-indigo-400 mb-2"></i>
              <p class="text-xs font-medium">Iniciando sesión segura y conectando a canal ${ch}...</p>
            </div>
          `}
        ` : `
          <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 text-slate-400">
            <div class="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
              <i data-lucide="video-off" class="w-6 h-6"></i>
            </div>
            <p class="text-xs sm:text-sm font-semibold text-slate-200">Dispositivo Desconectado</p>
            <p class="text-[11px] text-slate-400 mt-1 max-w-sm">La cámara ${ch} no puede transmitir en tiempo real porque el equipo está apagado o sin cobertura celular.</p>
            <button 
              onclick="forceConnectCamera('${vehi.deviceId}', ${ch})" 
              class="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              Intentar conectar de todos modos
            </button>
          </div>
        `}
      </div>

      <!-- Pie de información técnica -->
      <div class="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span class="truncate">WebSocket Wasm • Transmisión Directa CH${ch} • Sin delay</span>
        <span class="hidden sm:inline text-slate-500 text-[10px]">Doble clic en el video para pantalla completa</span>
      </div>
    </div>
  `;
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
        if (payload.data.jsession) opentraxxSession = payload.data.jsession;
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

// 7. GESTIÓN DEL VISOR DE VIDEO EN VIVO (WEBSOCKET NATIVO / OPENTRAXX)
let currentVideoDevice = null;
let currentVideoChannel = 1;
let currentVehicleName = '';
let currentIsOnline = false;
let currentChannelCount = 1;

async function openVideoModal(deviceId, vehicleName, isOnline, channelCount = 1) {
  currentVideoDevice = deviceId;
  currentVehicleName = vehicleName;
  currentIsOnline = isOnline;
  currentChannelCount = channelCount || 1;
  currentVideoChannel = 1;

  const modal = document.getElementById('video-modal');
  const titleEl = document.getElementById('video-modal-title');
  const subtitleEl = document.getElementById('video-modal-subtitle');
  const badgeEl = document.getElementById('video-modal-status-badge');
  const offlineAlert = document.getElementById('video-offline-alert');

  if (titleEl) titleEl.textContent = `Cámara en Vivo • ${vehicleName}`;
  if (subtitleEl) subtitleEl.textContent = `Dispositivo GPS: ${deviceId} • ${currentChannelCount} canal(es) de video`;

  if (badgeEl) {
    if (isOnline) {
      badgeEl.className = 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      badgeEl.textContent = 'En línea';
      if (offlineAlert) offlineAlert.classList.add('hidden');
    } else {
      badgeEl.className = 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30';
      badgeEl.textContent = 'Desconectado';
      if (offlineAlert) offlineAlert.classList.remove('hidden');
    }
  }

  // Generar botones de canales
  renderChannelPills();

  // Abrir ventana modal
  if (modal) modal.classList.remove('hidden');
  refreshIcons();

  // Iniciar carga del canal 1
  loadStreamChannel(currentVideoChannel);
}

function renderChannelPills() {
  const pillsContainer = document.getElementById('video-channel-pills');
  if (!pillsContainer) return;

  pillsContainer.innerHTML = '';
  const count = Math.max(1, currentChannelCount);

  for (let ch = 1; ch <= count; ch++) {
    const isActive = ch === currentVideoChannel;
    const btn = document.createElement('button');
    btn.className = isActive
      ? 'shrink-0 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm transition-all cursor-pointer'
      : 'shrink-0 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer';
    btn.textContent = `CH ${ch}`;
    btn.onclick = () => switchVideoChannel(ch);
    pillsContainer.appendChild(btn);
  }
}

function switchVideoChannel(ch) {
  currentVideoChannel = ch;
  renderChannelPills();
  loadStreamChannel(ch);
}

function syncLiveStream() {
  showToast('⚡ Sincronizando al instante en vivo...');
  loadStreamChannel(currentVideoChannel);
}

function retryCurrentChannel() {
  loadStreamChannel(currentVideoChannel);
}

async function loadStreamChannel(channel) {
  const iframeEl = document.getElementById('camera-iframe-player');
  const spinner = document.getElementById('video-spinner');
  const spinnerText = document.getElementById('video-spinner-text');
  const offlineAlert = document.getElementById('video-offline-alert');
  const techInfo = document.getElementById('video-stream-tech-info');

  if (spinner) spinner.classList.remove('opacity-0', 'pointer-events-none');
  if (spinnerText) spinnerText.textContent = `Conectando a canal CH${channel}...`;

  try {
    const res = await fetch(`/api/opentraxx/video/${currentVideoDevice}?channel=${channel}`);
    const data = await res.json();

    if (!data.success) {
      if (spinnerText) spinnerText.textContent = `Error: ${data.error || 'No se pudo obtener el stream'}`;
      return;
    }

    // Si el dispositivo está fuera de línea
    if (!data.isOnline) {
      if (offlineAlert) offlineAlert.classList.remove('hidden');
      if (spinner) spinner.classList.add('opacity-0', 'pointer-events-none');
      if (iframeEl) iframeEl.src = 'about:blank';
      return;
    } else {
      if (offlineAlert) offlineAlert.classList.add('hidden');
    }

    // Cargar reproductor nativo WebSocket (videoH5 / Canvas Wasm)
    if (iframeEl) {
      iframeEl.onload = () => {
        if (spinner) spinner.classList.add('opacity-0', 'pointer-events-none');
      };
      // Fallback para ocultar spinner si onload ya disparó
      setTimeout(() => {
        if (spinner) spinner.classList.add('opacity-0', 'pointer-events-none');
      }, 2500);

      iframeEl.src = data.wsPlayerUrl;
    }

    if (techInfo) {
      techInfo.textContent = `CH${channel} • WebSocket Wasm (Tiempo Real) • MDVR ${escapeHtml(currentVehicleName)}`;
    }

  } catch (err) {
    console.error('❌ Error al solicitar video stream:', err);
    if (spinnerText) spinnerText.textContent = 'Error al conectar con la API de video.';
  }
}


function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  const iframeEl = document.getElementById('camera-iframe-player');

  if (iframeEl) {
    iframeEl.src = 'about:blank';
  }

  if (modal) modal.classList.add('hidden');
}

// Cerrar con Escape o haciendo clic fuera del modal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeVideoModal();
});

document.addEventListener('DOMContentLoaded', async () => {
  refreshIcons();
  switchTab('ha');
  setupSSE();
  await ensureOpenTraxxSession();

  const modal = document.getElementById('video-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVideoModal();
    });
  }
});
