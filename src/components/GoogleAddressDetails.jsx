import React, { useState } from 'react'

function GoogleAddressDetails({ 
  realAddressFromCoords, 
  addressData, 
  coordinatesData,
  onValidateAddress
}) {
  // Estados para Address Validation API
  const [validationResult, setValidationResult] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Función para validar dirección con Address Validation API
  const handleValidateAddress = async () => {
    if (!addressData.linea1 || !addressData.municipio) {
      setValidationError('Se requiere al menos Línea 1 y Municipio para validar')
      return
    }

    setIsValidating(true)
    setValidationError('')
    setValidationResult(null)

    try {
      // Construir addressLines según formato esperado por la API
      const addressLines = [
        addressData.linea1,
        addressData.linea2 || '',
        addressData.barrio || '',
        `${addressData.municipio}, PR`
      ].filter(line => line.trim() !== '')

      console.log('📮 Enviando solicitud a:', '/api/validate-address', 'con datos:', {
        addressLines,
        regionCode: 'PR'
      });

      const response = await fetch('/api/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressLines: addressLines,
          regionCode: 'PR'
        })
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      setValidationResult(result)

      // Notificar al componente padre si se proporciona callback
      if (onValidateAddress) {
        onValidateAddress(result)
      }

    } catch (error) {
      console.error('❌ Error en Address Validation:', error)
      setValidationError(`Error: ${error.message}`)
    } finally {
      setIsValidating(false)
    }
  }

  // Función para interpretar el resultado de validación
  const getValidationStatus = () => {
    if (!validationResult?.result?.verdict) return null

    const verdict = validationResult.result.verdict
    const hasConfirmedComponents = verdict.hasConfirmedComponents
    const hasInferredComponents = verdict.hasInferredComponents
    const hasUnconfirmedComponents = verdict.hasUnconfirmedComponents

    if (hasConfirmedComponents && !hasUnconfirmedComponents) {
      return { type: 'success', message: '✅ Dirección completamente validada' }
    }
    if (hasInferredComponents) {
      return { type: 'warning', message: '⚠️ Dirección parcialmente validada (algunos componentes inferidos)' }
    }
    if (hasUnconfirmedComponents) {
      return { type: 'error', message: '❌ Dirección no confirmada (componentes no válidos)' }
    }
    return { type: 'info', message: 'ℹ️ Validación completada' }
  }
  // Debug: Log para verificar qué datos llegan al componente (SOLO cuando realAddressFromCoords cambia)
  React.useEffect(() => {
    if (realAddressFromCoords) {
      console.log('🎯 GoogleAddressDetails - realAddressFromCoords recibido:', realAddressFromCoords)
    }
  }, [realAddressFromCoords])

  React.useEffect(() => {
    if (coordinatesData) {
      console.log('📊 GoogleAddressDetails - coordinatesData recibido:', coordinatesData)
    }
  }, [coordinatesData])
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

      {/* Nueva sección: Address Validation API */}
      <details className="address-validation-api">
        <summary><h4>🔬 Validación con Google Address Validation API</h4></summary>
        <div className="validation-api-content">
          <div className="validation-api-info">
            <p>Valida tu dirección usando Google Address Validation API para obtener confirmación oficial de USPS y correcciones/normalizaciones.</p>
          </div>

          <div className="validation-api-controls">
            <button 
              onClick={handleValidateAddress}
              disabled={isValidating || !addressData.linea1 || !addressData.municipio}
              className="validate-btn"
            >
              {isValidating ? '🔄 Validando...' : '🔬 Validar Dirección'}
            </button>
            
            {!addressData.linea1 || !addressData.municipio ? (
              <small style={{ color: '#ef4444', marginTop: '0.5rem', display: 'block' }}>
                Se requiere al menos Línea 1 y Municipio para validar
              </small>
            ) : null}
          </div>

          {validationError && (
            <div className="validation-api-error">
              <h6>❌ Error en validación:</h6>
              <p>{validationError}</p>
            </div>
          )}

          {validationResult && (
            <div className="validation-api-results">
              {(() => {
                const status = getValidationStatus()
                return status ? (
                  <div className={`validation-status ${status.type}`}>
                    <h6>{status.message}</h6>
                  </div>
                ) : null
              })()}

              {validationResult.result?.address?.formattedAddress && (
                <div className="validated-address">
                  <h6>📮 Dirección normalizada por USPS:</h6>
                  <p className="formatted-address">{validationResult.result.address.formattedAddress}</p>
                </div>
              )}

              {validationResult.result?.geocode?.location && (
                <div className="validated-geocode">
                  <h6>🌍 Coordenadas validadas:</h6>
                  <p>
                    {validationResult.result.geocode.location.latitude.toFixed(6)}, 
                    {validationResult.result.geocode.location.longitude.toFixed(6)}
                  </p>
                  
                  {realAddressFromCoords && (
                    <div className="coordinate-comparison">
                      <p><strong>Comparación con coordenadas del mapa:</strong></p>
                      <p>Mapa: {realAddressFromCoords.coordenadas}</p>
                      <p>API: {validationResult.result.geocode.location.latitude.toFixed(6)}, {validationResult.result.geocode.location.longitude.toFixed(6)}</p>
                    </div>
                  )}
                </div>
              )}

              {validationResult.result?.verdict && (
                <div className="validation-details">
                  <h6>📋 Detalles de validación:</h6>
                  <ul>
                    {validationResult.result.verdict.hasConfirmedComponents && (
                      <li>✅ Componentes confirmados por USPS</li>
                    )}
                    {validationResult.result.verdict.hasInferredComponents && (
                      <li>⚠️ Algunos componentes fueron inferidos</li>
                    )}
                    {validationResult.result.verdict.hasUnconfirmedComponents && (
                      <li>❌ Algunos componentes no pudieron ser confirmados</li>
                    )}
                  </ul>
                </div>
              )}

              <details className="validation-raw-data">
                <summary><h6>🔍 Datos completos de la API</h6></summary>
                <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '300px' }}>
                  {JSON.stringify(validationResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </details>

    </div>
  )
}

export default GoogleAddressDetails
