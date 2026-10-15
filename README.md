# 🏠 Hub Unificado: Home Assistant & OpenTraxx (808GPS)

Plataforma unificada en tiempo real para la integración de dispositivos IoT (**Home Assistant**) y telemetría de flota vehicular con transmisión de video en vivo (**OpenTraxx 808GPS**).

---

## 📁 Estructura del Proyecto

```text
HomeAsis/
├── src/
│   ├── config.js          # Configuración y variables de entorno protegidas (.env)
│   ├── ha-client.js       # Cliente WebSocket con Home Assistant (reconocimiento automático y reconexión)
│   ├── opentraxx-client.js# Cliente API OpenTraxx (telemetría GPS y streaming MDVR)
│   ├── event-processor.js # Procesador BFF: agrupa entidades habilitadas por dispositivo físico
│   └── server.js          # Servidor Express, API REST unificada, SSE y hosting web
├── public/
│   ├── index.html         # Dashboard web responsivo (Tailwind CSS y Lucide Icons)
│   └── app.js             # Lógica cliente: SSE, acordeones de flota vehicular y streaming sin delay
├── .env                   # Credenciales y endpoints locales (protegido por .gitignore)
└── package.json           # Dependencias y script de ejecución (`npm start`)
```

---

## 🚀 Puesta en Marcha

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor:**
   ```bash
   npm start
   ```

3. **Abrir en el navegador:**
   - En tu PC: `http://localhost:4000`
   - En tu red local / móvil: `http://<TU_IP_LOCAL>:4000`
