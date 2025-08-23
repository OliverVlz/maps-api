import { useState } from 'react'
import HereAddressForm from '../components/HereAddressForm'
import HereMapComponent from '../components/HereMapComponent'
import HereAddressDetails from '../components/HereAddressDetails'
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
  
  // Estados para los detalles de validación (pasados desde el formulario)
  const [realAddressFromCoords, setRealAddressFromCoords] = useState(null)
  const [coordinatesData, setCoordinatesData] = useState(null)

  return (
    <div className="here-page-container">
      <h2 className="here-title">HERE - Formulario y Mapa</h2>
      <div className="here-content-grid">
        <div className="here-form-section">
          <HereAddressForm
            addressData={addressData}
            setAddressData={setAddressData}
            onLocationSelect={setSelectedLocation}
            onRealAddressUpdate={setRealAddressFromCoords}
            onCoordinatesDataUpdate={setCoordinatesData}
          />
        </div>
        <div className="here-map-section">
          <div className="here-map-container">
            <HereMapComponent
              location={selectedLocation}
              addressData={addressData}
            />
          </div>
          <div className="here-details-container">
            <HereAddressDetails
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

export default HerePage
