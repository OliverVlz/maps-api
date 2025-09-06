
import { useState } from 'react'
import { LoadScript } from '@react-google-maps/api'
import GoogleAddressForm from '../components/GoogleAddressForm'
import GoogleMapComponent from '../components/GoogleMapComponent'
import GoogleAddressDetails from '../components/GoogleAddressDetails'
import './GooglePage.css'

const libraries = ['places']

function GooglePage() {
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

  // Handler para manejar resultados de Address Validation API
  const handleAddressValidation = (validationResult) => {
    console.log('📮 Address Validation Result:', validationResult)
    // Aquí puedes añadir lógica adicional si necesitas procesar el resultado
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      <div className="google-page-container">
        <h2 className="google-title">GOOGLE - Formulario y Mapa</h2>
        <div className="google-content-grid">
          <div className="google-form-section">
            <GoogleAddressForm
              addressData={addressData}
              setAddressData={setAddressData}
              onLocationSelect={setSelectedLocation}
              onRealAddressUpdate={setRealAddressFromCoords}
              onCoordinatesDataUpdate={setCoordinatesData}
            />
          </div>
          <div className="google-map-section">
            <div className="google-map-container">
              <GoogleMapComponent
                location={selectedLocation}
                addressData={addressData}
              />
            </div>
            <div className="google-details-container">
              <GoogleAddressDetails
                realAddressFromCoords={realAddressFromCoords}
                addressData={addressData}
                coordinatesData={coordinatesData}
                onValidateAddress={handleAddressValidation}
              />
            </div>
          </div>
        </div>
      </div>
    </LoadScript>
  )
}

export default GooglePage
