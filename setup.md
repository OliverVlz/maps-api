# Configuración Google Maps API

## ⚠️ Error Common: "BillingNotEnabledMapError"

Si ves este error, significa que necesitas **habilitar la facturación** en tu proyecto de Google Cloud.

## Pasos para configurar correctamente:

### 1. **Crear proyecto en Google Cloud**:
   - Ve a: https://console.cloud.google.com/
   - Crea un nuevo proyecto o selecciona uno existente

### 2. **Habilitar Facturación** (OBLIGATORIO):
   - Ve a: https://console.cloud.google.com/billing
   - Vincula una tarjeta de crédito/débito
   - **Nota**: Google ofrece $200 USD gratis por mes para Maps

### 3. **Habilitar las APIs necesarias**:
   - Ve a: https://console.cloud.google.com/apis/library
   - Busca y habilita:
     - ✅ **Maps JavaScript API**
     - ✅ **Places API**
     - ✅ **Geocoding API**

### 4. **Crear API Key**:
   - Ve a: https://console.cloud.google.com/apis/credentials
   - Crea credenciales → API Key
   - Copia la API key

### 5. **Configurar tu proyecto**:
   ```bash
   # Crea el archivo .env con tu API key
   echo "VITE_GOOGLE_MAPS_API_KEY=tu_api_key_real" > .env
   ```

### 6. **Instalar y ejecutar**:
   ```bash
   pnpm install
   pnpm dev
   ```

## 🔧 Solución de problemas:

- **Error de facturación**: Asegúrate de tener billing habilitado
- **Error de permisos**: Verifica que las APIs estén habilitadas
- **Error de cuotas**: Revisa los límites en Google Cloud Console

## 💰 Costos:
- Google ofrece **$200 USD gratis** por mes
- Uso típico de desarrollo: **$0-5 USD/mes**
