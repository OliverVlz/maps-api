
import { useState } from 'react'
import GoogleAddressForm from '../components/GoogleAddressForm'
import GoogleMapComponent from '../components/GoogleMapComponent'
import GoogleAddressDetails from '../components/GoogleAddressDetails'
import './GooglePage.css'

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

  return (
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
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default GooglePage
