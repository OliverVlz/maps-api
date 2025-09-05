import React from 'react'

function MapboxAddressDetails({ 
  realAddressFromCoords, 
  addressData, 
  coordinatesData
}) {
  // Validar que addressData tenga valores de string válidos
  const safeAddressData = {
    linea1: typeof addressData?.linea1 === 'string' ? addressData.linea1 : '',
    linea2: typeof addressData?.linea2 === 'string' ? addressData.linea2 : '',
    municipio: typeof addressData?.municipio === 'string' ? addressData.municipio : '',
    barrio: typeof addressData?.barrio === 'string' ? addressData.barrio : '',
    descripcion: typeof addressData?.descripcion === 'string' ? addressData.descripcion : ''
  }

  // Funciones auxiliares para validación de direcciones
  const formatUserAddress = () => {
    const parts = []
    if (safeAddressData.linea1) parts.push(safeAddressData.linea1)
    if (safeAddressData.linea2) parts.push(safeAddressData.linea2)
    if (safeAddressData.barrio) parts.push(safeAddressData.barrio)
    if (safeAddressData.municipio) parts.push(`${safeAddressData.municipio}, PR`)
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
    const userMunicipio = (safeAddressData.municipio || '').toLowerCase()
    const realBarrio = realAddressFromCoords.barrio.toLowerCase()
    const userBarrio = (safeAddressData.barrio || '').toLowerCase()
    
    const municipioMatch = realMunicipio === userMunicipio
    const barrioMatch = realBarrio === userBarrio || realBarrio.includes(userBarrio) || userBarrio.includes(realBarrio)
    
    return !municipioMatch || (!barrioMatch && realBarrio && userBarrio)
  }

  const getDiscrepancyMessages = () => {
    if (!realAddressFromCoords) return []
    
    const messages = []
    const realMunicipio = realAddressFromCoords.municipio.toLowerCase()
    const userMunicipio = (safeAddressData.municipio || '').toLowerCase()
    const realBarrio = realAddressFromCoords.barrio.toLowerCase()
    const userBarrio = (safeAddressData.barrio || '').toLowerCase()
    
    if (realMunicipio && userMunicipio && realMunicipio !== userMunicipio) {
      messages.push(`Municipio: Mapbox dice "${realAddressFromCoords.municipio}", pero escribiste "${safeAddressData.municipio}"`)
    }
    
    if (realBarrio && userBarrio && !realBarrio.includes(userBarrio) && !userBarrio.includes(realBarrio)) {
      messages.push(`Barrio: Mapbox dice "${realAddressFromCoords.barrio}", pero escribiste "${safeAddressData.barrio}"`)
    }
    
    if (!realBarrio && userBarrio) {
      messages.push(`Barrio: Escribiste "${safeAddressData.barrio}" pero Mapbox no detecta un barrio específico en esta coordenada`)
    }
    
    return messages
  }

  // Si no hay datos para mostrar, no renderizar nada
  if (!realAddressFromCoords && !coordinatesData) {
    return null
  }

  return (
    <div className="address-details-container mapbox-details">
      {realAddressFromCoords && (
        <details className="address-validation mapbox-validation">
          <summary><h4>🗺️ Validación de Coordenadas (Mapbox)</h4></summary>
          <div className="validation-content">
            <div className="validation-info mapbox-info">
              <p><strong>Coordenadas seleccionadas:</strong> {realAddressFromCoords.coordenadas}</p>
            </div>
            
            <div className="validation-comparison">
              <div className="real-address mapbox-real-address">
                <h5>📍 Dirección REAL de Mapbox:</h5>
                <p className="address-text">{realAddressFromCoords.direccion_completa}</p>
                <div className="address-details">
                  <p><strong>Municipio:</strong> {realAddressFromCoords.municipio || 'No detectado'}</p>
                  <p><strong>Barrio:</strong> {realAddressFromCoords.barrio || 'No detectado'}</p>
                </div>
                
                {isGenericAddress() && (
                  <div className="generic-address-warning mapbox-generic-warning">
                    <h6>ℹ️ Información limitada disponible</h6>
                    <p>Esta ubicación rural tiene datos limitados en Mapbox. El pin está colocado correctamente en las coordenadas <strong>{realAddressFromCoords.coordenadas}</strong>, pero Mapbox no puede proporcionar detalles específicos de municipio/barrio para esta zona.</p>
                    <div className="suggestions">
                      <strong>Esto es normal para direcciones rurales:</strong>
                      <ul>
                        <li>📍 El mapa vectorial y coordenadas son correctos</li>
                        <li>🗺️ Mapbox usa datos OpenStreetMap para esta área rural</li>
                        <li>✅ Puedes usar esta ubicación con confianza</li>
                        <li>🚀 Los mapas vectoriales de Mapbox ofrecen mejor rendimiento</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="user-address mapbox-user-address">
                <h5>✏️ Tu dirección ingresada:</h5>
                <p className="address-text">{formatUserAddress()}</p>
                <div className="address-details">
                  <p><strong>Municipio:</strong> {safeAddressData.municipio || 'No especificado'}</p>
                  <p><strong>Barrio:</strong> {safeAddressData.barrio || 'No especificado'}</p>
                </div>
              </div>
            </div>

            {checkAddressDiscrepancies() && (
              <div className="validation-warning mapbox-warning">
                <h5>⚠️ Posibles discrepancias detectadas:</h5>
                <ul>
                  {getDiscrepancyMessages().map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
                <p><small>
                  💡 Verifica si el barrio/municipio que escribiste realmente corresponde a esta ubicación en Mapbox.
                </small></p>
              </div>
            )}

            <div className="mapbox-features">
              <h5>🗺️ Características de Mapbox:</h5>
              <div className="features-grid">
                <div className="feature-item">
                  <span>🚀</span>
                  <strong>Mapas Vectoriales</strong>
                  <p>Renderizado rápido y suave, ideal para aplicaciones web modernas</p>
                </div>
                <div className="feature-item">
                  <span>🌍</span>
                  <strong>Datos OpenStreetMap</strong>
                  <p>Información geográfica colaborativa y actualizada frecuentemente</p>
                </div>
                <div className="feature-item">
                  <span>📱</span>
                  <strong>Responsive</strong>
                  <p>Optimizado para dispositivos móviles y diferentes tamaños de pantalla</p>
                </div>
                <div className="feature-item">
                  <span>🎨</span>
                  <strong>Personalizable</strong>
                  <p>Estilos de mapa altamente personalizables y temas múltiples</p>
                </div>
              </div>
            </div>
          </div>
        </details>
      )}

      {coordinatesData && (
        <details className="coordinates-details mapbox-coordinates">
          <summary><h4>📍 Detalles de Coordenadas (Mapbox)</h4></summary>
          <div className="coordinates-content">
            <div className="coordinates-basic">
              <h5>📊 Información Básica</h5>
              <div className="coordinates-grid">
                <div className="coord-item">
                  <label>Latitud:</label>
                  <span className="coord-value">{coordinatesData.lat}</span>
                </div>
                <div className="coord-item">
                  <label>Longitud:</label>
                  <span className="coord-value">{coordinatesData.lng}</span>
                </div>
                <div className="coord-item">
                  <label>Precisión:</label>
                  <span className={`precision-level ${coordinatesData.precision.level}`}>
                    {coordinatesData.precision.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="coordinates-address">
              <h5>📍 Dirección Detectada</h5>
              <p className="main-address">{coordinatesData.address}</p>
              <p><small>{coordinatesData.precision.description}</small></p>
            </div>

            <div className="mapbox-tech-info">
              <h5>🔧 Información Técnica de Mapbox</h5>
              <div className="tech-grid">
                <div className="tech-item">
                  <label>API:</label>
                  <span>Mapbox Geocoding v5</span>
                </div>
                <div className="tech-item">
                  <label>Fuente:</label>
                  <span>OpenStreetMap + Propietario</span>
                </div>
                <div className="tech-item">
                  <label>Renderizado:</label>
                  <span>WebGL Vector Tiles</span>
                </div>
                <div className="tech-item">
                  <label>Formato:</label>
                  <span>GeoJSON</span>
                </div>
              </div>
            </div>
          </div>
        </details>
      )}

      <div className="mapbox-comparison">
        <details className="comparison-info">
          <summary><h4>🔍 Comparación: Mapbox vs HERE Maps</h4></summary>
          <div className="comparison-content">
            <div className="comparison-grid">
              <div className="provider-comparison">
                <h5>🗺️ Mapbox</h5>
                <ul>
                  <li>✅ Mapas vectoriales ultra rápidos</li>
                  <li>✅ Excelente personalización visual</li>
                  <li>✅ Datos OpenStreetMap actualizados</li>
                  <li>✅ Optimizado para web y mobile</li>
                  <li>✅ Estilos de mapa múltiples</li>
                  <li>⚠️ Menor cobertura en áreas rurales</li>
                </ul>
              </div>
              <div className="provider-comparison">
                <h5>🧭 HERE Maps</h5>
                <ul>
                  <li>✅ Excelente para navegación</li>
                  <li>✅ Datos detallados de tráfico</li>
                  <li>✅ Mejor en direcciones comerciales</li>
                  <li>✅ Mapas offline avanzados</li>
                  <li>⚠️ Interfaz menos moderna</li>
                  <li>⚠️ Menos personalización visual</li>
                </ul>
              </div>
            </div>
            
            <div className="recommendation">
              <h6>💡 Recomendación de Uso:</h6>
              <p><strong>Usa Mapbox para:</strong> Aplicaciones web modernas, interfaces elegantes, mapas personalizados</p>
              <p><strong>Usa HERE para:</strong> Navegación precisa, datos comerciales detallados, aplicaciones de transporte</p>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default MapboxAddressDetails
