import React, { useState, useCallback, useEffect } from 'react'
import { AddressAutofill, AddressMinimap, useConfirmAddress } from '@mapbox/search-js-react'
import { useForm } from 'react-hook-form'

const MapboxAddressFormOfficial = ({ 
  addressData, 
  setAddressData, 
  onAddressSelect, 
  onRealAddressUpdate,
  onCoordinatesDataUpdate 
}) => {
  const [minimapFeature, setMinimapFeature] = useState(null)
  const [showMinimap, setShowMinimap] = useState(false)
  const [searchStatus, setSearchStatus] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])

  // Función para agregar información de debug
  const addDebugInfo = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => [...prev.slice(-9), { message, type, timestamp }])
  }

  // Hook oficial de Mapbox para confirmación de direcciones
  const { formRef, showConfirm } = useConfirmAddress({
    accessToken: import.meta.env.VITE_MAPBOX_API_KEY,
    options: {
      country: 'pr', // Limitar a Puerto Rico
      language: 'es', // Respuesta en español
      proximity: [-66.590149, 18.220833] // Centro de Puerto Rico
    }
  })

  // Debug mejorado: Verificar que el token esté disponible
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_API_KEY
    console.log('🔑 MAPBOX Token disponible:', !!token)
    console.log('🔑 MAPBOX Token length:', token?.length)
    
    if (!token) {
      addDebugInfo('❌ Token de Mapbox no configurado!', 'error')
      setSearchStatus({
        type: 'error',
        message: '❌ Token de Mapbox no configurado. Verifica VITE_MAPBOX_API_KEY'
      })
    } else {
      addDebugInfo(`✅ Token configurado (${token.length} chars)`, 'success')
    }

    // Verificar que las librerías de Mapbox estén cargadas
    if (typeof AddressAutofill === 'undefined') {
      addDebugInfo('❌ AddressAutofill no está disponible', 'error')
    } else {
      addDebugInfo('✅ AddressAutofill cargado correctamente', 'success')
    }
  }, [])

  // React Hook Form para validación
  const { register, formState: { errors }, setValue, watch } = useForm({
    defaultValues: addressData || {
      linea1: '',
      linea2: '',
      municipio: '',
      barrio: '',
      descripcion: ''
    }
  })

  const watchedFields = watch()

  // Manejar cuando Mapbox encuentra y selecciona una dirección
  const handleAutofillRetrieve = useCallback((response) => {
    addDebugInfo('✅ handleAutofillRetrieve ejecutado', 'success')
    console.log('✅ MAPBOX - Respuesta completa:', response)
    
    if (response.features && response.features.length > 0) {
      const feature = response.features[0]
      addDebugInfo(`📍 Feature encontrado: ${feature.properties?.name}`, 'success')
      
      setMinimapFeature(feature)
      setShowMinimap(true)
      
      // Extraer información de la dirección
      const properties = feature.properties
      const context = properties.context || {}
      
      // Extraer municipio y barrio
      let municipio = ''
      let barrio = ''
      
      if (context.place && context.place.name) {
        municipio = context.place.name
      } else if (context.district && context.district.name) {
        municipio = context.district.name
      }
      
      if (context.neighborhood && context.neighborhood.name) {
        barrio = context.neighborhood.name
      } else if (context.locality && context.locality.name) {
        barrio = context.locality.name
      }

      // Actualizar campos del formulario
      if (municipio) setValue('municipio', municipio)
      if (barrio) setValue('barrio', barrio)

      // Notificar al componente padre con la ubicación
      const locationData = {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        address: properties.full_address || properties.name,
        linea1: properties.address_line1 || '',
        municipio: municipio,
        barrio: barrio,
        coordenadas: `${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]}`
      }

      if (onAddressSelect) {
        onAddressSelect(locationData)
      }

      if (onRealAddressUpdate) {
        onRealAddressUpdate({
          direccion_completa: properties.full_address || properties.name,
          municipio: municipio,
          barrio: barrio,
          coordenadas: locationData.coordenadas
        })
      }

      if (onCoordinatesDataUpdate) {
        onCoordinatesDataUpdate({
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address,
          precision: {
            level: properties.accuracy || 'high',
            description: 'Dirección validada con Mapbox oficial'
          }
        })
      }

      setSearchStatus({
        type: 'success',
        message: '✅ Dirección encontrada y validada automáticamente'
      })
    } else {
      addDebugInfo('⚠️ No se encontraron features en la respuesta', 'warning')
    }
  }, [onAddressSelect, onRealAddressUpdate, onCoordinatesDataUpdate, setValue])

  // Handlers adicionales para debug
  const handleInputFocus = () => {
    addDebugInfo('🎯 Input enfocado - buscando sugerencias...', 'info')
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    if (value.length > 2) {
      addDebugInfo(`⌨️ Escribiendo: "${value}" (${value.length} chars)`, 'info')
    }
  }

  // Manejar envío del formulario con confirmación automática
  const handleFormSubmit = useCallback(async (e) => {
    e.preventDefault()
    addDebugInfo('📝 Enviando formulario...', 'info')
    
    try {
      // Usar la confirmación automática de Mapbox
      const result = await showConfirm()
      
      console.log('🔍 MAPBOX - Resultado de confirmación:', result)
      addDebugInfo(`🔍 Confirmación: ${result.type}`, 'success')

      if (result.type === 'nochange') {
        // La dirección está confirmada, continuar con el envío
        const formData = new FormData(e.target)
        const addressFormData = {
          linea1: formData.get('address-line1') || '',
          linea2: formData.get('address-line2') || '',
          municipio: formData.get('municipio') || '',
          barrio: formData.get('barrio') || '',
          descripcion: formData.get('descripcion') || ''
        }

        if (setAddressData) {
          setAddressData(addressFormData)
        }

        setSearchStatus({
          type: 'success',
          message: '✅ Formulario enviado exitosamente'
        })

        addDebugInfo('✅ Formulario enviado correctamente', 'success')
        console.log('📝 MAPBOX - Formulario enviado:', addressFormData)
      } else if (result.type === 'changed') {
        addDebugInfo('✏️ Dirección actualizada con sugerencia', 'info')
        setSearchStatus({
          type: 'info',
          message: '✏️ Dirección actualizada con sugerencia de Mapbox'
        })
      }
    } catch (error) {
      console.error('❌ MAPBOX - Error en confirmación:', error)
      addDebugInfo(`❌ Error: ${error.message}`, 'error')
      setSearchStatus({
        type: 'error',
        message: '❌ Error al confirmar la dirección'
      })
    }
  }, [showConfirm, setAddressData])

  // Sincronizar cambios del formulario con el padre
  useEffect(() => {
    if (setAddressData && watchedFields) {
      // Usar función de actualización con verificación de igualdad para evitar actualizaciones innecesarias
      setAddressData(prevData => {
        // Comparar objetos para evitar actualizaciones innecesarias que causan loops
        if (JSON.stringify(prevData) === JSON.stringify(watchedFields)) {
          return prevData // No actualizar si los datos son iguales
        }
        return watchedFields
      })
    }
  }, [watchedFields, setAddressData])

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ color: '#7c3aed', marginBottom: '20px' }}>🗺️ Información de Dirección (Mapbox Oficial)</h2>
      
      {/* Panel de Debug */}
      <div style={{ 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '24px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#475569' }}>🔍 Debug Info (Últimos 10 eventos)</h3>
        {debugInfo.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Esperando eventos...</p>
        ) : (
          debugInfo.map((info, index) => (
            <div key={index} style={{ 
              margin: '4px 0', 
              fontSize: '13px',
              color: info.type === 'error' ? '#dc2626' : info.type === 'success' ? '#059669' : info.type === 'warning' ? '#d97706' : '#475569'
            }}>
              <span style={{ opacity: 0.7 }}>[{info.timestamp}]</span> {info.message}
            </div>
          ))
        )}
      </div>
      
      <div ref={formRef} onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Campo de búsqueda principal con AddressAutofill */}
        <div>
          <label htmlFor="address-search" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Buscar Dirección
          </label>
          <small style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block' }}>
            Comienza a escribir una dirección en Puerto Rico para autocompletado inteligente
          </small>
          
          <div style={{ position: 'relative' }}>
            <AddressAutofill
              accessToken={import.meta.env.VITE_MAPBOX_API_KEY}
              onRetrieve={handleAutofillRetrieve}
              options={{
                country: 'pr',
                language: 'es',
                proximity: [-66.590149, 18.220833],
                types: ['address', 'street', 'place', 'locality', 'neighborhood'],
                limit: 8
              }}
            >
              <input
                type="text"
                autoComplete="address-line1"
                name="address-line1"
                placeholder="Ej: Calle Principal 123, Caguas, PR"
                required
                onChange={handleInputChange}
                style={{ 
                  width: '100%',
                  padding: '12px 40px 12px 12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed'
                  e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                  handleInputFocus()
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </AddressAutofill>
            
            <svg 
              viewBox="0 0 18 18" 
              width="20" 
              height="20"
              fill="currentColor" 
              style={{ 
                position: 'absolute', 
                top: '50%', 
                right: '12px', 
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#6b7280'
              }}
            >
              <path d="M7.4 2.5c-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9c1 0 1.8-.2 2.5-.8l3.7 3.7c.2.2.4.3.8.3.7 0 1.1-.4 1.1-1.1 0-.3-.1-.5-.3-.8L11.4 10c.4-.8.8-1.6.8-2.5.1-2.8-2.1-5-4.8-5zm0 1.6c1.8 0 3.2 1.4 3.2 3.2s-1.4 3.2-3.2 3.2-3.3-1.3-3.3-3.1 1.4-3.3 3.3-3.3z" />
            </svg>
          </div>
          
          {searchStatus && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              background: searchStatus.type === 'error' ? '#fef2f2' : searchStatus.type === 'success' ? '#f0fdf4' : '#fefce8',
              color: searchStatus.type === 'error' ? '#dc2626' : searchStatus.type === 'success' ? '#059669' : '#d97706',
              border: `1px solid ${searchStatus.type === 'error' ? '#fecaca' : searchStatus.type === 'success' ? '#bbf7d0' : '#fed7aa'}`
            }}>
              {searchStatus.message}
            </div>
          )}
        </div>

        {/* Minimapa de confirmación */}
        {showMinimap && minimapFeature && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Confirmación Visual
            </label>
            <div style={{ 
              height: '200px', 
              width: '100%', 
              borderRadius: '8px', 
              overflow: 'hidden',
              border: '2px solid #e5e7eb'
            }}>
              <AddressMinimap
                feature={minimapFeature}
                show={true}
                satelliteToggle={true}
                canAdjustMarker={true}
                footer={true}
                accessToken={import.meta.env.VITE_MAPBOX_API_KEY}
              />
            </div>
          </div>
        )}

        {/* Campos adicionales del formulario */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Apartamento, Suite, etc. (Opcional)
          </label>
          <input
            type="text"
            autoComplete="address-line2"
            name="address-line2"
            placeholder="Apt 2B, Suite 100, etc."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Municipio *
            </label>
            <input
              {...register('municipio', { required: 'Municipio es requerido' })}
              type="text"
              autoComplete="address-level2"
              name="municipio"
              placeholder="Se completará automáticamente"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            {errors.municipio && (
              <span style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px', display: 'block' }}>
                {errors.municipio.message}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Barrio/Sector
            </label>
            <input
              {...register('barrio')}
              type="text"
              name="barrio"
              placeholder="Se completará automáticamente"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Descripción Adicional
          </label>
          <textarea
            {...register('descripcion')}
            name="descripcion"
            placeholder="Puntos de referencia, instrucciones especiales, etc."
            rows="3"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>

        <button 
          type="button"
          onClick={handleFormSubmit}
          style={{
            width: '100%',
            padding: '14px',
            background: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#6d28d9'}
          onMouseOut={(e) => e.target.style.background = '#7c3aed'}
        >
          🗺️ Validar y Guardar Dirección
        </button>
      </div>

      {/* Sección de ayuda */}
      <details style={{ marginTop: '32px' }}>
        <summary style={{ cursor: 'pointer', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <h4 style={{ display: 'inline', color: '#475569' }}>📋 Ejemplos de Búsqueda y Troubleshooting</h4>
        </summary>
        <div style={{ padding: '16px', backgroundColor: '#f8fafc', marginTop: '8px', borderRadius: '6px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ color: '#059669', marginBottom: '8px' }}>🎯 Direcciones que funcionan muy bien:</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' }}>
              <div style={{ background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <code>Plaza de Armas, San Juan</code>
              </div>
              <div style={{ background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <code>Calle Fortaleza 123, Viejo San Juan</code>
              </div>
              <div style={{ background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <code>Avenida Muñoz Rivera, Hato Rey</code>
              </div>
              <div style={{ background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <code>Centro Comercial Plaza Las Américas</code>
              </div>
            </div>
          </div>
          
          <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '6px', marginTop: '12px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#1d4ed8' }}>🔧 Si las sugerencias no aparecen:</h5>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#1e40af' }}>
              <li>Verifica que el token de Mapbox esté configurado correctamente</li>
              <li>Asegúrate de tener conexión a internet</li>
              <li>Prueba escribir al menos 3 caracteres</li>
              <li>Verifica que no haya bloqueadores de anuncios activos</li>
              <li>Revisa la consola del navegador para errores de red</li>
              <li>Confirma que el dominio esté en la lista de URLs permitidas en Mapbox</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  )
}

export default MapboxAddressFormOfficial