# 🏠 Home Assistant & IoT Client (Node.js)

Proyecto modular para conectar, extraer y monitorear datos en tiempo real desde **Home Assistant** (Docker Desktop) e integración de telemetría vehicular.

---

## 📁 Estructura del Proyecto

```text
HomeAsis/
├── src/
│   ├── config.js          # Lectura de variables de entorno y URLs (HTTP y WS)
│   ├── ha-client.js       # Cliente WebSocket con Home Assistant y reconexión
│   ├── event-processor.js # Procesador BFF: agrupa entidades habilitadas por dispositivo
│   ├── server.js          # Servidor Express, API REST, SSE y hosting del frontend
│   ├── test-connection.js # Diagnóstico de autenticación
│   ├── fetch-states.js    # Extracción de catálogo de entidades
│   └── listen-events.js   # Escucha en tiempo real de eventos
├── public/
│   ├── index.html         # Dashboard web con Tailwind CSS y Lucide Icons
│   └── app.js             # Lógica cliente: SSE y renderizado dinámico
├── data/
│   └── entities_dump.json # Volcado JSON de entidades
├── .env                   # Tu configuración local protegida
└── package.json
```
