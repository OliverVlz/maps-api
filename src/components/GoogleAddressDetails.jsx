import React from 'react'

function GoogleAddressDetails({ 
  realAddressFromCoords, 
  addressData, 
  coordinatesData
}) {
  // Funciones auxiliares para validación de direcciones
  const formatUserAddress = () => {
    const parts = []
    if (addressData.linea1) parts.push(addressData.linea1)
    if (addressData.linea2) parts.push(addressData.linea2)
    if (addressData.barrio) parts.push(addressData.barrio)
    if (addressData.municipio) parts.push(`${addressData.municipio}, PR`)
    return parts.join(', ')
  }

  const isGenericAddress = () => {
    if (!realAddressFromCoords) return false
    
    const address = realAddressFromCoords.direccion_completa.toLowerCase()
    const municipio = realAddressFromCoords.municipio.toLowerCase()
    const barrio = realAddressFromCoords.barrio.toLowerCase()
    
    const genericIndicators = [
      address === 'puerto rico',
      address === 'puerto rico, usa',
      address.includes('puerto rico') && address.split(',').length <= 2,
      !municipio || municipio === '',
      !barrio || barrio === ''
    ]
    
    return genericIndicators.some(indicator => indicator)
  }

  const checkAddressDiscrepancies = () => {
    if (!realAddressFromCoords) return false
    
    const realMunicipio = realAddressFromCoords.municipio.toLowerCase()
    const userMunicipio = (addressData.municipio || '').toLowerCase()
    const realBarrio = realAddressFromCoords.barrio.toLowerCase()
    const userBarrio = (addressData.barrio || '').toLowerCase()
    
    const municipioMatch = realMunicipio === userMunicipio
    const barrioMatch = realBarrio === userBarrio || realBarrio.includes(userBarrio) || userBarrio.includes(realBarrio)
    
    return !municipioMatch || (!barrioMatch && realBarrio && userBarrio)
  }

  const getDiscrepancyMessages = () => {
    if (!realAddressFromCoords) return []
    
    const messages = []
    const realMunicipio = realAddressFromCoords.municipio.toLowerCase()
    const userMunicipio = (addressData.municipio || '').toLowerCase()
    const realBarrio = realAddressFromCoords.barrio.toLowerCase()
    const userBarrio = (addressData.barrio || '').toLowerCase()
    
    if (realMunicipio && userMunicipio && realMunicipio !== userMunicipio) {
      messages.push(`Municipio: Google Maps dice "${realAddressFromCoords.municipio}", pero escribiste "${addressData.municipio}"`)
    }
    
    if (realBarrio && userBarrio && !realBarrio.includes(userBarrio) && !userBarrio.includes(realBarrio)) {
      messages.push(`Barrio: Google Maps dice "${realAddressFromCoords.barrio}", pero escribiste "${addressData.barrio}"`)
    }
    
    if (!realBarrio && userBarrio) {
      messages.push(`Barrio: Escribiste "${addressData.barrio}" pero Google Maps no detecta un barrio específico en esta coordenada`)
    }
    
    return messages
  }

  // Si no hay datos para mostrar, no renderizar nada
  if (!realAddressFromCoords && !coordinatesData) {
    return null
  }

  return (
    <div className="address-details-container">
      {realAddressFromCoords && (
        <details className="address-validation">
          <summary><h4>🔍 Validación de Coordenadas</h4></summary>
          <div className="validation-content">
            <div className="validation-info">
              <p><strong>Coordenadas seleccionadas:</strong> {realAddressFromCoords.coordenadas}</p>
            </div>
            
            <div className="validation-comparison">
              <div className="real-address">
                <h5>📍 Dirección REAL de Google Maps:</h5>
                <p className="address-text">{realAddressFromCoords.direccion_completa}</p>
                <div className="address-details">
                  <p><strong>Municipio:</strong> {realAddressFromCoords.municipio || 'No detectado'}</p>
                  <p><strong>Barrio:</strong> {realAddressFromCoords.barrio || 'No detectado'}</p>
                </div>
                
                {isGenericAddress() && (
                  <div className="generic-address-warning">
                    <h6>ℹ️ Información limitada disponible</h6>
                    <p>Esta ubicación rural tiene datos limitados en Google Maps. El pin está colocado correctamente en las coordenadas <strong>{realAddressFromCoords.coordenadas}</strong>, pero Google Maps no puede proporcionar detalles específicos de municipio/barrio para esta zona.</p>
                    <div className="suggestions">
                      <strong>Esto es normal para direcciones rurales:</strong>
                      <ul>
                        <li>📍 El mapa y coordenadas son correctos</li>
                        <li>🗺️ Google Maps tiene datos limitados para esta área rural</li>
                        <li>✅ Puedes usar esta ubicación con confianza</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="user-address">
                <h5>✏️ Tu dirección ingresada:</h5>
                <p className="address-text">{formatUserAddress()}</p>
                <div className="address-details">
                  <p><strong>Municipio:</strong> {addressData.municipio || 'No especificado'}</p>
                  <p><strong>Barrio:</strong> {addressData.barrio || 'No especificado'}</p>
                </div>
              </div>
            </div>

            {checkAddressDiscrepancies() && (
              <div className="validation-warning">
                <h5>⚠️ Posibles discrepancias detectadas:</h5>
                <ul>
                  {getDiscrepancyMessages().map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
                <p><small>
                  💡 Verifica si el barrio/municipio que escribiste realmente corresponde a esta ubicación.
                </small></p>
              </div>
            )}
          </div>
        </details>
      )}


    </div>
  )
}

export default GoogleAddressDetails
