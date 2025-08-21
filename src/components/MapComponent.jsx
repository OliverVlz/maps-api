import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { useState } from 'react'

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px'
}

const defaultCenter = {
  lat: 18.2208,
  lng: -66.5901
}

const mapOptions = {
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#193341' }]
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ color: '#2c5234' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#29768a' }, { lightness: -37 }]
    }
  ]
}

function MapComponent({ location, addressData }) {
  const [showInfoWindow, setShowInfoWindow] = useState(false)

  const center = location || defaultCenter
  const zoom = location ? 16 : 9

  const handleMarkerClick = () => {
    setShowInfoWindow(!showInfoWindow)
  }

  const formatAddress = () => {
    console.log('🏠 Formateando dirección con datos:', addressData)
    const parts = []
    
    // Línea 1 de dirección
    if (addressData.linea1) {
      parts.push(addressData.linea1)
    }
    
    // Línea 2 (apartamento, suite, etc.)
    if (addressData.linea2) {
      parts.push(addressData.linea2)
    }
    
    // Barrio (solo si no está ya incluido en línea1)
    if (addressData.barrio) {
      const barrioText = addressData.barrio
      const linea1Lower = (addressData.linea1 || '').toLowerCase()
      const barrioLower = barrioText.toLowerCase()
      
      // Solo agregar barrio si no está ya incluido en la línea 1
      if (!linea1Lower.includes(barrioLower) && !linea1Lower.includes(barrioText.toLowerCase())) {
        parts.push(barrioText)
      }
    }
    
    // Municipio (evitar duplicación)
    if (addressData.municipio) {
      const municipioText = addressData.municipio
      const currentAddress = parts.join(', ').toLowerCase()
      const municipioLower = municipioText.toLowerCase()
      
      // Solo agregar municipio si no está ya incluido
      if (!currentAddress.includes(municipioLower)) {
        parts.push(`${municipioText}, PR`)
      } else {
        // Si ya está incluido pero falta PR, solo agregar PR
        if (!currentAddress.includes(', pr')) {
          parts.push('PR')
        }
      }
    }
    
    const result = parts.join(', ')
    console.log('🏠 Dirección formateada final:', result)
    return result
  }

  return (
    <div className="map-component">
      <div className="map-header">
        <h3>Ubicación en el Mapa</h3>
        {location ? (
          <div className="location-status confirmed">
            <span className="status-icon">✅</span>
            <span>Ubicación Confirmada</span>
          </div>
        ) : (
          <div className="location-status pending">
            <span className="status-icon">📍</span>
            <span>Busca una dirección para ver la ubicación</span>
          </div>
        )}
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={mapOptions}
      >
        {location && (
          <Marker
            position={location}
            onClick={handleMarkerClick}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="8" fill="#ff4444" stroke="#ffffff" stroke-width="2"/>
                  <circle cx="16" cy="16" r="3" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 16)
            }}
          />
        )}

        {location && showInfoWindow && (
          <InfoWindow
            position={location}
            onCloseClick={() => setShowInfoWindow(false)}
          >
            <div className="info-window">
              <h4>Dirección Seleccionada</h4>
              <p>{formatAddress()}</p>
              {addressData.descripcion && (
                <p><strong>Descripción:</strong> {addressData.descripcion}</p>
              )}
              <div className="coordinates">
                <small>
                  Lat: {location.lat.toFixed(6)}, 
                  Lng: {location.lng.toFixed(6)}
                </small>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {location && (
        <div className="location-details">
          <h4>Detalles de la Ubicación</h4>
          <div className="details-grid">
            <div className="detail-item">
              <label>Coordenadas:</label>
              <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
            </div>
            <div className="detail-item">
              <label>Dirección Completa:</label>
              <span>{formatAddress()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapComponent
