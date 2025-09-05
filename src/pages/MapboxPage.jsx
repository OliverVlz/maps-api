import { useState } from 'react'
import MapboxAddressFormOfficial from '../components/MapboxAddressFormOfficial'
import MapboxMapComponent from '../components/MapboxMapComponent'
import MapboxAddressDetails from '../components/MapboxAddressDetails'
import MapboxDebugTest from '../components/MapboxDebugTest'
import './MapboxPage.css'

function MapboxPage() {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [addressData, setAddressData] = useState({
    linea1: '',
    linea2: '',
    municipio: '',
    barrio: '',
    descripcion: ''
  })
  
  // Estados para los detalles de validación (pasados desde el formulario)
  const [realAddressFromCoords, setRealAddressFromCoords] = useState(null)
  const [coordinatesData, setCoordinatesData] = useState(null)

  return (
    <div className="mapbox-page-container">
      <h2 className="mapbox-title">Mapbox - Formulario y Mapa</h2>
      
      {/* 🔍 Debug Test */}
      <MapboxDebugTest />
      
      {/* Componente oficial de Mapbox */}
      <div style={{ 
        margin: '20px 0', 
        padding: '20px', 
        border: '2px solid #10b981', 
        borderRadius: '8px', 
        background: '#f0fdf4' 
      }}>
        <h3 style={{ color: '#059669', marginTop: 0 }}>✨ Implementación Oficial de Mapbox</h3>
        <MapboxAddressFormOfficial
          addressData={addressData}
          setAddressData={setAddressData}
          onAddressSelect={setSelectedLocation}
          onRealAddressUpdate={setRealAddressFromCoords}
          onCoordinatesDataUpdate={setCoordinatesData}
        />
      </div>
      
      <div className="mapbox-content-grid">
        <div className="mapbox-map-section">
          <div className="mapbox-map-container">
            <MapboxMapComponent
              location={selectedLocation}
              addressData={addressData}
            />
          </div>
          <div className="mapbox-details-container">
            <MapboxAddressDetails
              realAddressFromCoords={realAddressFromCoords}
              addressData={addressData}
              coordinatesData={coordinatesData}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapboxPage
