import { useState } from 'react'
import HereAddressForm from '../components/HereAddressForm'
import HereMapComponent from '../components/HereMapComponent'
import './HerePage.css'

function HerePage() {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [addressData, setAddressData] = useState({
    linea1: '',
    linea2: '',
    municipio: '',
    barrio: '',
    descripcion: ''
  })

  return (
    <div className="here-page-container">
      <h2 className="here-title">HERE - Formulario y Mapa</h2>
      <div className="here-content-flex">
        <div className="here-form-section">
          <HereAddressForm
            addressData={addressData}
            setAddressData={setAddressData}
            onLocationSelect={setSelectedLocation}
          />
        </div>
        <div className="here-map-section">
          <HereMapComponent
            location={selectedLocation}
            addressData={addressData}
          />
        </div>
      </div>
    </div>
  )
}

export default HerePage
