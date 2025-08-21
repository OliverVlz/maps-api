# Formulario de Direcciones Rurales - Puerto Rico

Aplicación React para gestionar direcciones rurales de Puerto Rico con integración de Google Maps API.

## Características

- 📍 Búsqueda de direcciones con autocompletado
- 🗺️ Visualización de ubicaciones en mapa interactivo
- 🏝️ Específicamente diseñado para Puerto Rico
- ✅ Confirmación visual de ubicaciones
- 📱 Diseño responsivo y moderno

## Campos del Formulario

- **Dirección Línea 1** (requerido)
- **Dirección Línea 2** (opcional)
- **Municipio** (requerido) - Lista completa de municipios de PR
- **Barrio/Sector** (requerido)
- **Descripción** (opcional)

## Configuración

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar API Key de Google Maps

1. Crea un archivo `.env` en la raíz del proyecto:

```bash
# Windows
echo VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui > .env

# Mac/Linux  
echo "VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui" > .env
```

2. Reemplaza `tu_api_key_aqui` con tu API key real de Google Maps

### 3. Obtener API Key de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Crea credenciales (API Key)
5. Configura restricciones de API key (recomendado)

### 4. Ejecutar la aplicación

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`

## Tecnologías Utilizadas

- **React 18** - Framework de UI
- **Vite** - Build tool
- **Google Maps API** - Mapas y geocodificación
- **React Hook Form** - Manejo de formularios
- **PNPM** - Gestor de paquetes

## Funcionalidades

### Búsqueda de Direcciones
- Autocompletado en tiempo real
- Filtrado específico para Puerto Rico
- Selección de sugerencias con clic

### Mapa Interactivo
- Visualización de ubicación seleccionada
- Marcador personalizado
- Información detallada en InfoWindow
- Coordenadas precisas

### Validación
- Campos requeridos marcados
- Validación de municipios de PR
- Mensajes de error claros

## Estructura del Proyecto

```
src/
├── components/
│   ├── AddressForm.jsx    # Formulario de direcciones
│   └── MapComponent.jsx   # Componente del mapa
├── App.jsx               # Componente principal
├── App.css              # Estilos principales
└── main.jsx             # Punto de entrada
```

## Seguridad

- Las variables de entorno están configuradas para Vite
- La API key debe estar protegida en producción
- Considera implementar restricciones de dominio en Google Cloud

## Soporte

Este proyecto está optimizado para direcciones rurales de Puerto Rico y incluye todos los 78 municipios de la isla.
