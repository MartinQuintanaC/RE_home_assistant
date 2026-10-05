# 🏠 Home Assistant Client & Connector (Node.js)

Proyecto modular para conectar, extraer y monitorear datos en tiempo real desde **Home Assistant** (Docker Desktop).

---

## 📁 Estructura del Proyecto

```text
HomeAsis/
├── src/
│   ├── config.js          # Lectura de variables de entorno y URLs (HTTP y WS)
│   ├── test-connection.js # Tarea 2: Prueba de conexión y autenticación
│   ├── fetch-states.js    # Tarea 3: Extracción de todas las entidades (REST)
│   └── listen-events.js   # Tarea 4: Escucha en tiempo real de eventos (WebSocket)
├── data/
│   └── entities_dump.json # Volcado JSON de entidades (generado por fetch-states)
├── .env.example           # Plantilla de configuración
├── .env                   # Tu configuración local (con tu Token)
└── package.json
```

---

## 🚀 Tareas Asignadas

### 1. Configurar Credenciales
Edita el archivo [`.env`](file:///c:/Users/Martin/Desktop/HomeAsis/.env):
```env
HA_URL=http://localhost:3000
HA_TOKEN=tu_long_lived_access_token_aqui
```
> **¿Dónde conseguir el Token?**
> 1. Abre Home Assistant (`http://localhost:3000` o `http://192.168.18.12:3000`).
> 2. Haz clic en tu usuario (esquina inferior izquierda).
> 3. En la pestaña **Seguridad**, ve hasta **Tokens de acceso de larga duración**.
> 4. Haz clic en **Crear token**, dale un nombre (ej. `NodeBackend`) y copia la clave.

---

### 2. Probar Conexión
Verifica que Home Assistant esté en línea y que el Token sea válido:
```bash
npm run test-conn
```

---

### 3. Extraer Entidades y Estados (Genérico)
Descarga el catálogo completo de entidades detectadas en tu Home Assistant, agrupadas por tipo/dominio (`sensor`, `media_player`, `remote`, etc.) y guarda una copia en `data/entities_dump.json`:
```bash
npm run fetch-states
```

---

### 4. Escuchar Cambios en Vivo (WebSocket)
Conecta un canal WebSocket que recibe alertas instantáneas cada vez que un sensor o dispositivo cambia:
```bash
npm run listen-events
```
