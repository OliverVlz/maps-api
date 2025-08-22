
import { useState } from 'react'
import GoogleAddressForm from '../components/GoogleAddressForm'
import GoogleMapComponent from '../components/GoogleMapComponent'
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

  return (
    <div className="google-page-container">
      <h2 className="google-title">Google - Formulario y Mapa</h2>
      <div className="google-content-flex">
        <div className="google-form-section">
          <GoogleAddressForm
            addressData={addressData}
            setAddressData={setAddressData}
            onLocationSelect={setSelectedLocation}
          />
        </div>
        <div className="google-map-section">
          <GoogleMapComponent
            location={selectedLocation}
            addressData={addressData}
          />
        </div>
      </div>
    </div>
  )
}

export default GooglePage
