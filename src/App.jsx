import { useState } from 'react'
import AddressForm from './components/AddressForm'
import MapComponent from './components/MapComponent'
import { LoadScript } from '@react-google-maps/api'
import './App.css'

const libraries = ['places']

function App() {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [addressData, setAddressData] = useState({
    linea1: '',
    linea2: '',
    municipio: '',
    barrio: '',
    descripcion: ''
  })

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="error-container">
        <h2>Error de Configuración</h2>
        <p>Por favor configura tu API key de Google Maps en el archivo .env:</p>
        <code>VITE_GOOGLE_MAPS_API_KEY=tu_api_key</code>
      </div>
    )
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      <div className="app">
        <header className="app-header">
          <h1>Formulario de Direcciones Rurales - Puerto Rico</h1>
        </header>
        <main className="app-main">
          <div className="form-section">
            <AddressForm 
              addressData={addressData}
              setAddressData={setAddressData}
              onLocationSelect={setSelectedLocation}
            />
          </div>
          <div className="map-section">
            <MapComponent 
              location={selectedLocation}
              addressData={addressData}
            />
          </div>
        </main>
      </div>
    </LoadScript>
  )
}

export default App
