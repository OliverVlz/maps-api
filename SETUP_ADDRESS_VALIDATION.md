# Configuración de Google Address Validation API

## 📋 **Pasos de Configuración**

### 1. **Google Cloud Console - Configurar API Key del Servidor**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto existente
3. Ve a **APIs & Services > Credentials**
4. Crea una nueva **API Key** (diferente a la del frontend)
5. **Restricciones importantes:**
   - ✅ **Restricción por IP**: Añade la IP de tu servidor
   - ✅ **APIs restringidas**: Solo habilita "Address Validation API"
   - ❌ **NO uses restricción por HTTP referrer** (esa es solo para frontend)

### 2. **Habilitar Address Validation API**

1. En Google Cloud Console, ve a **APIs & Services > Library**
2. Busca "Address Validation API"
3. Clic en **Enable**

### 3. **Configurar el Backend**

1. Navega a la carpeta del servidor:

```bash
cd server
```

2. Instala dependencias:

```bash
npm install
```

3. Configura las variables de entorno:

   - Edita `server/.env`
   - Reemplaza `tu_google_api_key_para_servidor_aqui` con tu API Key del servidor

4. Ejecuta el servidor:

```bash
npm run dev
```

### 4. **Configurar el Frontend (Vite)**

En tu archivo `vite.config.js`, añade proxy para el backend:

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

### 5. **Probar la Configuración**

1. **Backend**: Ve a http://localhost:3001/api/health
2. **Frontend**: Llena el formulario y clic en "🔬 Validar Dirección"

## 🔒 **Seguridad**

- ✅ **API Key del Frontend**: Restringida por HTTP referrer (solo Places API)
- ✅ **API Key del Backend**: Restringida por IP (solo Address Validation API)
- ✅ **CORS**: Configurado en el servidor para permitir origen del frontend
- ✅ **Validación**: El backend valida los datos antes de enviar a Google

## 🚀 **Comandos de Desarrollo**

```bash
# Terminal 1: Frontend (puerto 5173)
pnpm run dev

# Terminal 2: Backend (puerto 3001)
cd server
npm run dev
```

## 📊 **Estructura de Respuesta de la API**

```json
{
  "result": {
    "verdict": {
      "hasConfirmedComponents": true,
      "hasInferredComponents": false,
      "hasUnconfirmedComponents": false
    },
    "address": {
      "formattedAddress": "123 Calle Principal, Caguas, PR 00725, USA"
    },
    "geocode": {
      "location": {
        "latitude": 18.2342,
        "longitude": -66.0395
      }
    }
  }
}
```

## ⚠️ **Troubleshooting**

### Error: "API keys with referer restrictions cannot be used with this API"

- Solución: Usa una API Key diferente para el servidor con restricción por IP

### Error: CORS blocked

- Solución: Verifica que el servidor esté corriendo en puerto 3001 y que el proxy de Vite esté configurado

### Error: 403 Forbidden

- Solución: Verifica que Address Validation API esté habilitada en Google Cloud Console
