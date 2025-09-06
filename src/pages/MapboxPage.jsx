import { useState } from 'react'
import MapboxAddressFormClean from '../components/MapboxAddressFormClean'
import MapboxMapComponent, { MapboxStyleSelector } from '../components/MapboxMapComponent'
import MapboxAddressDetails from '../components/MapboxAddressDetails'
import './MapboxPage.css'

function MapboxPage() {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [addressData, setAddressData] = useState({
    line1: '',
    line2: '',
    municipio: '',
    barrio: '',
    zipCode: '',
    state: 'Puerto Rico'
  })
  
  // Estados para los detalles de validación (pasados desde el formulario)
  const [realAddressFromCoords, setRealAddressFromCoords] = useState(null)
  const [coordinatesData, setCoordinatesData] = useState(null)

  // Estado para el estilo del mapa
  const [mapStyle, setMapStyle] = useState('streets-v12')

  // Estilos de mapa disponibles
  const mapStyles = [
    { id: 'streets-v12', name: '🏙️ Calles', description: 'Mapa de calles clásico' },
    { id: 'outdoors-v12', name: '🏔️ Exterior', description: 'Ideal para actividades al aire libre' },
    { id: 'light-v11', name: '☀️ Claro', description: 'Estilo minimalista y claro' },
    { id: 'dark-v11', name: '🌙 Oscuro', description: 'Tema oscuro elegante' },
    { id: 'satellite-v9', name: '🛰️ Satélite', description: 'Vista satelital real' },
    { id: 'satellite-streets-v12', name: '🗺️ Híbrido', description: 'Satélite con nombres de calles' },
    { id: 'navigation-day-v1', name: '🚗 Navegación', description: 'Optimizado para navegación' }
  ]

  return (
    <div className="mapbox-page-container">
      <h2 className="mapbox-title">Mapbox - Formulario y Mapa</h2>
      <div className="mapbox-content-grid">
        <div className="mapbox-form-section">
          <MapboxAddressFormClean
            addressData={addressData}
            setAddressData={setAddressData}
            onAddressSelect={setSelectedLocation}
            onRealAddressUpdate={setRealAddressFromCoords}
            onCoordinatesDataUpdate={setCoordinatesData}
          />
        </div>
        <div className="mapbox-map-section">
          <div className="mapbox-map-container">
            <MapboxMapComponent 
              location={selectedLocation}
              addressData={addressData}
              mapStyle={mapStyle}
            />
            <MapboxStyleSelector
              mapStyle={mapStyle}
              onStyleChange={setMapStyle}
              mapStyles={mapStyles}
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
