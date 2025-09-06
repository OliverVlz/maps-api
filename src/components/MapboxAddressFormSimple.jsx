import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { AddressAutofill, useConfirmAddress } from '@mapbox/search-js-react'
import { useForm } from 'react-hook-form'

const MapboxAddressFormSimple = ({ 
  addressData, 
  setAddressData, 
  onAddressSelect, 
  onRealAddressUpdate
}) => {
  const [searchStatus, setSearchStatus] = useState(null)
  const [municipios, setMunicipios] = useState([])
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false)
  const [municipiosSource, setMunicipiosSource] = useState(null)

  // Hook oficial de Mapbox para confirmación de direcciones
  const { formRef } = useConfirmAddress({
    accessToken: import.meta.env.VITE_MAPBOX_API_KEY,
    options: {
      country: 'pr', // Limitar a Puerto Rico
      language: 'es', // Respuesta en español
      proximity: [-66.590149, 18.220833] // Centro de Puerto Rico
    }
  })

  // React Hook Form setup
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: addressData || {}
  })

  const watchedFields = watch()
  const lastSentHashRef = useRef('')

  // Cargar municipios al montar el componente
  useEffect(() => {
    const loadMunicipios = async () => {
      setIsLoadingMunicipios(true)
      
      try {
        // Cargar directamente desde archivo local (más confiable)
        const response = await fetch('/data/municipios-pr.json')
        const data = await response.json()
        
        if (data.municipios && Array.isArray(data.municipios)) {
          // Extraer solo los nombres de los municipios
          const municipiosFromLocal = data.municipios
            .map(municipio => municipio.name)
            .filter(name => name && typeof name === 'string')
            .sort()
          
          setMunicipios(municipiosFromLocal)
          setMunicipiosSource('local-json')
          console.log('✅ Mapbox Simple - Municipios cargados desde archivo local:', municipiosFromLocal.length)
        }
      } catch (localError) {
        console.warn('⚠️ Mapbox Simple - Error cargando municipios:', localError.message)
        // Lista de fallback con municipios principales
        const fallbackMunicipios = [
          'San Juan', 'Bayamón', 'Carolina', 'Ponce', 'Caguas', 'Guaynabo', 'Arecibo',
          'Toa Baja', 'Mayagüez', 'Trujillo Alto', 'Aguadilla', 'Humacao'
        ].sort()
        setMunicipios(fallbackMunicipios)
        setMunicipiosSource('fallback')
      }
      
      setIsLoadingMunicipios(false)
    }

    loadMunicipios()
  }, [])

  // Hash de los campos para detectar cambios
  const watchedHash = useMemo(() => {
    return JSON.stringify(watchedFields)
  }, [watchedFields])

  // Manejo del evento retrieve de Mapbox
  const handleAutofillRetrieve = useCallback((result) => {
    console.log('🎯 Mapbox Autofill result:', result)
    
    if (result && result.features && result.features.length > 0) {
      const feature = result.features[0]
      const properties = feature.properties || {}
      
      setSearchStatus({
        type: 'success',
        message: '✅ Dirección encontrada y autocompletada'
      })

      // Llenar campos automáticamente
      if (properties.address_line1) setValue('linea1', properties.address_line1)
      if (properties.address_line2) setValue('linea2', properties.address_line2)
      if (properties.place_name) {
        // Extraer municipio del place_name
        const parts = properties.place_name.split(',')
        if (parts.length >= 2) {
          setValue('municipio', parts[parts.length - 2].trim())
        }
      }
      
      // Callback para el componente padre
      if (onAddressSelect) {
        onAddressSelect(feature)
      }
    }
  }, [setValue, onAddressSelect])

  // Manejo del input de búsqueda
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    if (value.length > 2) {
      setSearchStatus({
        type: 'info',
        message: '🔍 Buscando direcciones...'
      })
    } else {
      setSearchStatus(null)
    }
  }, [])

  // Manejo del submit del formulario
  const handleFormSubmit = useCallback((data) => {
    console.log('📋 Form submitted:', data)
    
    if (onRealAddressUpdate) {
      onRealAddressUpdate(data)
    }
    
    setSearchStatus({
      type: 'success',
      message: '✅ Dirección validada correctamente'
    })
  }, [onRealAddressUpdate])

  // Sincronizar con el componente padre
  useEffect(() => {
    if (!setAddressData) return
    if (!watchedFields) return
    if (lastSentHashRef.current === watchedHash) return
    lastSentHashRef.current = watchedHash
    setAddressData(watchedFields)
  }, [watchedHash, watchedFields, setAddressData])

  return (
    <div className="address-form">
      <h2>Información de Dirección</h2>
      
      {/* Estado simplificado */}
      {searchStatus && (
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: searchStatus.type === 'success' ? '#e8f5e8' : 
                          searchStatus.type === 'error' ? '#ffebee' : '#e3f2fd',
          border: searchStatus.type === 'success' ? '1px solid #4caf50' :
                  searchStatus.type === 'error' ? '1px solid #f44336' : '1px solid #2196f3',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '14px',
          color: searchStatus.type === 'success' ? '#2e7d32' :
                 searchStatus.type === 'error' ? '#c62828' : '#1976d2'
        }}>
          {searchStatus.message}
        </div>
      )}
      
      <form ref={formRef} onSubmit={handleSubmit(handleFormSubmit)} className="form">
        
        <div className="form-group">
          <label htmlFor="busqueda">Buscar Ubicación</label>
          <small style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block' }}>
            Busca direcciones urbanas, rurales (KM), barrios, sectores, negocios, puntos de referencia con Mapbox
          </small>
          <div className="search-container">
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
                placeholder="Ej: Calle Principal, KM 15.2 Carr 123, Barrio Pueblo, etc."
                onChange={handleInputChange}
                className="search-input"
              />
            </AddressAutofill>
            {searchStatus && (
              <div className={`search-status ${searchStatus.type}`}>
                <span>{searchStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="linea1">Dirección Línea 1 *</label>
          <input
            {...register('linea1', { required: 'Este campo es requerido' })}
            type="text"
            id="linea1"
            name="address-line1"
            autoComplete="address-line1"
            placeholder="Ej: Calle Principal 123"
          />
          {errors.linea1 && <span className="error">{errors.linea1.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="linea2">Dirección Línea 2</label>
          <input
            {...register('linea2')}
            type="text"
            id="linea2"
            name="address-line2"
            autoComplete="address-line2"
            placeholder="Apartamento, suite, etc. (opcional)"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="municipio">Municipio *</label>
            <select
              {...register('municipio', { required: 'Selecciona un municipio' })}
              id="municipio"
              name="locality"
              disabled={isLoadingMunicipios}
            >
              <option value="">
                {isLoadingMunicipios ? 'Cargando municipios...' : 'Selecciona municipio'}
              </option>
              {municipios.filter(municipio => typeof municipio === 'string' && municipio.trim()).map((municipio, index) => (
                <option key={`${municipio}-${index}`} value={municipio}>{municipio}</option>
              ))}
            </select>
            {errors.municipio && <span className="error">{errors.municipio.message}</span>}
            {municipiosSource !== 'fallback' && (
              <small style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                ✅ Municipios cargados desde {
                  municipiosSource === 'local-json' ? 'archivo local (oficial)' :
                  'lista interna'
                }
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="barrio">Barrio/Sector</label>
            <input
              {...register('barrio')}
              type="text"
              id="barrio"
              name="region"
              placeholder="Ej: Pueblo, Centro, etc."
            />
            <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              💡 Tip: Si seleccionas una ubicación de la búsqueda, intentaremos llenar este campo automáticamente
            </small>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción Adicional</label>
          <textarea
            {...register('descripcion')}
            id="descripcion"
            rows="3"
            placeholder="Puntos de referencia, detalles adicionales..."
          />
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-btn"
            style={{ width: '100%' }}
          >
            Validar Dirección
          </button>
        </div>
      </form>
    </div>
  )
}

export default MapboxAddressFormSimple
