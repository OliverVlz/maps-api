# Configuración de APIs para Maps App

Este proyecto utiliza tres proveedores de mapas: **Google Maps**, **HERE Maps**, y **Mapbox**. Necesitarás API keys para cada uno.

## 🔑 Configuración de Variables de Entorno

### 1. **Crear archivo `.env`**:

```bash
# Copia el archivo de ejemplo
cp .env.example .env
```

### 2. **Configurar tus API Keys** en el archivo `.env`:

```bash
# Google API Configuration
VITE_GOOGLE_MAPS_API_KEY=tu_google_api_key_aqui

# HERE API Configuration
VITE_HERE_API_KEY=tu_here_api_key_aqui

# Mapbox API Configuration
VITE_MAPBOX_ACCESS_TOKEN=tu_mapbox_token_aqui
```

## 🟦 Google Maps API

### ⚠️ Error Common: "BillingNotEnabledMapError" / "Error 403"

Si ves este error, significa que necesitas **habilitar la facturación** en tu proyecto de Google Cloud.

### Pasos para configurar correctamente:

#### 1. **Crear proyecto en Google Cloud**:

- Ve a: https://console.cloud.google.com/
- Crea un nuevo proyecto o selecciona uno existente

#### 2. **Habilitar Facturación** (OBLIGATORIO):

- Ve a: https://console.cloud.google.com/billing
- Vincula una tarjeta de crédito/débito
- **Nota**: Google ofrece $200 USD gratis por mes para Maps

#### 3. **Habilitar las APIs necesarias**:

- Ve a: https://console.cloud.google.com/apis/library
- Busca y habilita **ESTAS 3 APIs ESPECÍFICAS**:
  - ✅ **Maps JavaScript API** (para mapas y geocoding)
  - ✅ **Places API (New)** (para búsqueda de texto) - ⚠️ **IMPORTANTE: Es diferente a la antigua Places API**
  - ✅ **Geocoding API** (para reverse geocoding)

**🔗 Enlaces directos:**

- Maps JavaScript API: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
- Places API (New): https://console.cloud.google.com/apis/library/places-backend.googleapis.com
- Geocoding API: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com

#### 4. **Crear API Key**:

- Ve a: https://console.cloud.google.com/apis/credentials
- Crea credenciales → API Key
- Copia la API key y ponla en `VITE_GOOGLE_API_KEY`

## 🟨 HERE Maps API

#### 1. **Crear cuenta en HERE**:

- Ve a: https://developer.here.com/
- Registrate gratis

#### 2. **Crear proyecto**:

- Ve al Dashboard y crea un nuevo proyecto
- Genera una API Key
- Copia la API key y ponla en `VITE_HERE_API_KEY`

## 🟪 Mapbox API

#### 1. **Crear cuenta en Mapbox**:

- Ve a: https://www.mapbox.com/
- Registrate gratis

#### 2. **Obtener Access Token**:

- Ve a tu dashboard
- Copia tu Access Token público
- Ponlo en `VITE_MAPBOX_ACCESS_TOKEN`

## 🚀 Ejecutar el proyecto

```bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm dev
```

## 🔧 Solución de problemas:

### Google:

- **Error 403**: Verifica que la facturación esté habilitada y las APIs activadas
- **Error de permisos**: Asegúrate de tener Places API (New) habilitada
- **Error de cuotas**: Revisa los límites en Google Cloud Console

### HERE:

- **Error 401**: Verifica que tu API key sea correcta
- **Error 429**: Has excedido el límite de requests

### Mapbox:

- **Error de token**: Verifica que tu access token sea público y válido

## 💰 Costos:

- **Google**: $200 USD gratis por mes
- **HERE**: Plan gratuito con 250,000 requests/mes
- **Mapbox**: Plan gratuito con 50,000 requests/mes
- Uso típico de desarrollo: **$0-5 USD/mes**
