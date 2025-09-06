import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AddressAutofill, useConfirmAddress } from '@mapbox/search-js-react'
import { useForm, Controller } from 'react-hook-form'

const MapboxAddressFormClean = ({ 
  addressData, 
  setAddressData, 
  onAddressSelect, 
  onRealAddressUpdate
}) => {
  // Estados locales
  const [searchStatus, setSearchStatus] = useState(null)
  const [municipios, setMunicipios] = useState([])
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false)
  const [isGeocodingManual, setIsGeocodingManual] = useState(false)
  
  // Estados para búsqueda por coordenadas
  const [manualCoordinates, setManualCoordinates] = useState('')
  const [coordinatesError, setCoordinatesError] = useState('')
  const [isValidatingCoords, setIsValidatingCoords] = useState(false)

  // Hook oficial de Mapbox para confirmación de direcciones
  const { formRef } = useConfirmAddress({
    accessToken: import.meta.env.VITE_MAPBOX_API_KEY,
    options: {
      country: 'pr',
      language: 'es',
      proximity: [-66.590149, 18.220833]
    }
  })

  // React Hook Form setup
  const { handleSubmit, setValue, watch, formState: { errors }, control } = useForm({
    defaultValues: addressData || {}
  })

  const watchedFields = watch()
  const lastSentHashRef = useRef('')
  const coordinatesTimeoutRef = useRef(null)

  // ⭐ Geocodificar dirección manual para buscar en el mapa
  const geocodeManualAddress = useCallback(async (addressData) => {
    setIsGeocodingManual(true)
    console.log('🗺️ Geocodificando dirección manual:', addressData)
    
    try {
      // Construir la dirección completa
      const addressParts = [
        addressData.line1,
        addressData.line2,
        addressData.municipio,
        addressData.zipCode,
        addressData.state || 'Puerto Rico'
      ].filter(Boolean)
      
      const fullAddress = addressParts.join(', ')
      console.log('🗺️ Dirección completa para geocodificar:', fullAddress)
      
      // URL encode la dirección
      const encodedAddress = encodeURIComponent(fullAddress)
      
      // Llamar a la API de Geocoding de Mapbox
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?` +
        `access_token=${import.meta.env.VITE_MAPBOX_API_KEY}&` +
        `country=pr&` +
        `language=es&` +
        `proximity=-66.590149,18.220833&` +
        `limit=1`
      )
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('🗺️ Respuesta de geocoding:', data)
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const [lng, lat] = feature.center
        
        console.log('✅ Coordenadas encontradas:', { lat, lng })
        
        // Actualizar el mapa con las coordenadas encontradas
        if (onAddressSelect) {
          onAddressSelect({ 
            feature, 
            lat, 
            lng, 
            source: 'manual-geocoding',
            originalAddress: addressData
          })
        }
        
        setSearchStatus({
          type: 'success',
          message: '✅ Dirección confirmada y ubicada en el mapa'
        })
        
        return { lat, lng, feature }
      } else {
        console.log('❌ No se encontraron coordenadas para la dirección')
        setSearchStatus({
          type: 'error',
          message: '⚠️ Dirección confirmada pero no se pudo ubicar en el mapa'
        })
        return null
      }
    } catch (error) {
      console.error('❌ Error geocodificando dirección:', error)
      setSearchStatus({
        type: 'error',
        message: '⚠️ Dirección confirmada pero error al ubicar en el mapa'
      })
      return null
    } finally {
      setIsGeocodingManual(false)
    }
  }, [onAddressSelect])

  // ⭐ Validar y procesar coordenadas manuales
  const validateCoordinates = useCallback((coordsString) => {
    if (!coordsString.trim()) return null
    
    // Patrones para detectar diferentes formatos de coordenadas
    const patterns = [
      // Formato: lat, lng (decimal)
      /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,
      // Formato: lat lng (separado por espacio)
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/,
      // Formato: lat°lng (con grados)
      /^(-?\d+\.?\d*)°?\s*(-?\d+\.?\d*)°?$/
    ]
    
    for (const pattern of patterns) {
      const match = coordsString.trim().match(pattern)
      if (match) {
        const lat = parseFloat(match[1])
        const lng = parseFloat(match[2])
        
        // Validar rangos para Puerto Rico (aproximados)
        // Latitud: 17.8 - 18.6
        // Longitud: -67.9 - -65.2
        if (lat >= 17.8 && lat <= 18.6 && lng >= -67.9 && lng <= -65.2) {
          return { lat, lng, valid: true, error: null }
        } else {
          return { 
            lat, 
            lng, 
            valid: false, 
            error: '⚠️ Las coordenadas están fuera del rango de Puerto Rico' 
          }
        }
      }
    }
    
    return { 
      valid: false, 
      error: '❌ Formato inválido. Usa: 18.2208, -66.5901 o 18.2208 -66.5901' 
    }
  }, [])

  // ⭐ Procesar coordenadas manuales
  const processManualCoordinates = useCallback(async (coordsString) => {
    console.log('🌐 Procesando coordenadas manuales:', coordsString)
    
    const validation = validateCoordinates(coordsString)
    if (!validation) {
      setCoordinatesError('')
      return
    }
    
    if (!validation.valid) {
      setCoordinatesError(validation.error)
      return
    }
    
    setCoordinatesError('')
    setIsValidatingCoords(true)
    
    try {
      const { lat, lng } = validation
      console.log('✅ Coordenadas válidas:', { lat, lng })
      
      // Hacer reverse geocoding para obtener la dirección
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${import.meta.env.VITE_MAPBOX_API_KEY}&` +
        `language=es&` +
        `types=address,poi,place`
      )
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('🗺️ Reverse geocoding response:', data)
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const props = feature.properties
        
        // Autocompletar formulario con datos del reverse geocoding
        if (props.address) {
          setValue('line1', props.address)
        } else if (feature.place_name) {
          const addressPart = feature.place_name.split(',')[0]
          setValue('line1', addressPart)
        }
        
        // Municipio desde context
        if (feature.context && Array.isArray(feature.context)) {
          const place = feature.context.find(item => item.id && item.id.includes('place'))
          if (place && place.text) {
            setValue('municipio', place.text)
          }
        }
        
        // Estado siempre Puerto Rico
        setValue('state', 'Puerto Rico')
        
        // Actualizar el mapa
        if (onAddressSelect) {
          onAddressSelect({ 
            feature, 
            lat, 
            lng, 
            source: 'coordinates',
            coordinates: `${lat}, ${lng}`,
            formData: {
              line1: props.address || feature.place_name.split(',')[0],
              municipio: feature.context?.find(item => item.id?.includes('place'))?.text || '',
              state: 'Puerto Rico'
            }
          })
        }
        
        setSearchStatus({
          type: 'success',
          message: '✅ Coordenadas procesadas y dirección encontrada'
        })
        
      } else {
        console.log('⚠️ No se encontró dirección para las coordenadas')
        
        // Aún así actualizar el mapa con las coordenadas
        if (onAddressSelect) {
          onAddressSelect({ 
            lat, 
            lng, 
            source: 'coordinates',
            coordinates: `${lat}, ${lng}`,
            formData: {
              line1: `Coordenadas: ${lat}, ${lng}`,
              state: 'Puerto Rico'
            }
          })
        }
        
        setSearchStatus({
          type: 'success',
          message: '✅ Coordenadas válidas ubicadas en el mapa'
        })
      }
      
    } catch (error) {
      console.error('❌ Error procesando coordenadas:', error)
      setCoordinatesError('❌ Error al procesar coordenadas')
      setSearchStatus({
        type: 'error',
        message: '❌ Error al procesar coordenadas'
      })
    } finally {
      setIsValidatingCoords(false)
    }
  }, [validateCoordinates, setValue, onAddressSelect])

  // ⭐ Manejar cambio en el input de coordenadas con procesamiento automático
  const handleCoordinatesChange = useCallback(async (e) => {
    const value = e.target.value
    setManualCoordinates(value)
    
    // Limpiar timeout anterior
    if (coordinatesTimeoutRef.current) {
      clearTimeout(coordinatesTimeoutRef.current)
    }
    
    if (!value.trim()) {
      setCoordinatesError('')
      return
    }
    
    // Validar en tiempo real
    const validation = validateCoordinates(value)
    
    if (!validation) {
      setCoordinatesError('')
      return
    }
    
    if (!validation.valid) {
      setCoordinatesError(validation.error)
      return
    }
    
    // Si las coordenadas son válidas, procesarlas automáticamente con debounce
    setCoordinatesError('')
    console.log('🌐 Coordenadas válidas detectadas, procesando automáticamente...')
    
    // Procesar automáticamente después de 800ms para evitar múltiples llamadas
    coordinatesTimeoutRef.current = setTimeout(() => {
      processManualCoordinates(value)
    }, 800)
    
  }, [validateCoordinates, processManualCoordinates])

  // ⭐ Manejar selección de AddressAutofill
  const handleAutofillRetrieve = useCallback((e) => {
    console.log('📍 AddressAutofill onRetrieve triggered:', e)
    const feature = e?.features?.[0]
    if (!feature) {
      console.log('❌ No feature found in retrieve event')
      return
    }

    console.log('✅ Feature found:', feature)
    const props = feature.properties
    const [lng, lat] = feature.geometry?.coordinates || []
    
    // Mapear los campos del autofill a nuestro formulario
    if (props.address_line1) {
      setValue('line1', props.address_line1)
    }
    
    if (props.address_line2) {
      setValue('line2', props.address_line2)
    }
    
    // Municipio desde context/place_name (más confiable para PR)
    if (feature.context && Array.isArray(feature.context)) {
      const place = feature.context.find(item => item.id && item.id.includes('place'))
      if (place && place.text) {
        setValue('municipio', place.text)
      }
    } else if (props.place_name) {
      // Fallback: extraer municipio del place_name
      const parts = props.place_name.split(',')
      if (parts.length >= 2) {
        const municipio = parts[parts.length - 2].trim()
        setValue('municipio', municipio)
      }
    }
    
    if (props.postcode) {
      setValue('zipCode', props.postcode)
    }
    
    // Estado siempre Puerto Rico para direcciones de PR
    setValue('state', 'Puerto Rico')
    
    console.log('📍 Valores autocompletados en el formulario:')
    console.log('- line1:', props.address_line1)
    console.log('- line2:', props.address_line2)
    console.log('- zipCode:', props.postcode)
    console.log('- state: Puerto Rico')
    
    // Actualizar estado de búsqueda
    setSearchStatus({
      type: 'success',
      message: '✅ Dirección encontrada y autocompletada'
    })
    
    // Callback para el componente padre - incluir más información
    if (onAddressSelect) {
      onAddressSelect({ 
        feature, 
        lat, 
        lng, 
        source: 'autofill',
        formData: {
          line1: props.address_line1,
          line2: props.address_line2,
          municipio: feature.context?.find(item => item.id?.includes('place'))?.text || 
                    (props.place_name ? props.place_name.split(',')[props.place_name.split(',').length - 2]?.trim() : ''),
          zipCode: props.postcode,
          state: 'Puerto Rico'
        }
      })
    }
  }, [setValue, onAddressSelect])

  // Manejo del input de búsqueda
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    console.log('🔍 Input changed:', value)
    if (value.length > 2) {
      setSearchStatus({
        type: 'info',
        message: '🔍 Buscando direcciones...'
      })
      console.log('🔍 Setting search status: searching...')
    } else {
      setSearchStatus(null)
      console.log('🔍 Clearing search status')
    }
  }, [])

  // Cargar municipios al montar el componente
  useEffect(() => {
    // Debug: Verificar API key
    const apiKey = import.meta.env.VITE_MAPBOX_API_KEY
    console.log('🗝️ Mapbox API Key presente:', !!apiKey)
    console.log('🗝️ API Key length:', apiKey ? apiKey.length : 0)
    console.log('🗝️ API Key prefix:', apiKey ? apiKey.substring(0, 5) + '...' : 'N/A')
    
    const loadMunicipios = async () => {
      setIsLoadingMunicipios(true)
      
      try {
        const response = await fetch('/data/municipios-pr.json')
        const data = await response.json()
        
        if (data.municipios && Array.isArray(data.municipios)) {
          const municipiosFromLocal = data.municipios
            .map(municipio => municipio.name)
            .filter(name => name && typeof name === 'string')
            .sort()
          
          setMunicipios(municipiosFromLocal)
        }
      } catch {
        const fallbackMunicipios = [
          'San Juan', 'Bayamón', 'Carolina', 'Ponce', 'Caguas', 'Guaynabo', 'Arecibo',
          'Toa Baja', 'Mayagüez', 'Trujillo Alto', 'Aguadilla', 'Humacao'
        ].sort()
        setMunicipios(fallbackMunicipios)
      }
      
      setIsLoadingMunicipios(false)
    }

    loadMunicipios()

    return () => {
      if (coordinatesTimeoutRef.current) {
        clearTimeout(coordinatesTimeoutRef.current)
      }
    }
  }, [])

  // Debug: Monitorear si aparecen sugerencias después del cambio de configuración
  useEffect(() => {
    const checkForSuggestions = () => {
      const autofillElements = document.querySelectorAll('[data-search-js-autofill]')
      const suggestionsElements = document.querySelectorAll('[data-search-js-autofill] ul, [data-search-js-autofill] div')
      
      console.log('🔍 DOM Debug (Post-config change):')
      console.log('- Elementos con data-search-js-autofill:', autofillElements.length)
      console.log('- Posibles contenedores de sugerencias:', suggestionsElements.length)
      
      if (suggestionsElements.length > 0) {
        console.log('✅ Se encontraron contenedores de sugerencias!')
        suggestionsElements.forEach((el, index) => {
          console.log(`- Container ${index}:`, el)
          console.log(`- Visible:`, window.getComputedStyle(el).display !== 'none')
        })
      } else {
        console.log('❌ No se encontraron contenedores de sugerencias')
      }
    }
    
    // Ejecutar check después de que el componente esté completamente cargado
    const timer = setTimeout(checkForSuggestions, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  // Notificar cambios al componente padre
  useEffect(() => {
    const currentHash = JSON.stringify(watchedFields)
    
    if (currentHash !== lastSentHashRef.current) {
      lastSentHashRef.current = currentHash
      
      if (setAddressData) {
        setAddressData(watchedFields)
      }
      
      if (onRealAddressUpdate) {
        onRealAddressUpdate(watchedFields)
      }
    }
  }, [watchedFields, setAddressData, onRealAddressUpdate])

  // Manejo del submit del formulario
  const handleFormSubmit = useCallback(async (data) => {
    console.log('📋 Form submit triggered with data:', data)
    console.log('📋 Current form values:', watchedFields)
    console.log('📋 Form errors:', errors)
    console.log('📋 Form validation result:', Object.keys(errors).length === 0 ? 'VALID' : 'INVALID')
    
    if (onRealAddressUpdate) {
      onRealAddressUpdate(data)
    }
    
    // Intentar geocodificar la dirección para mostrarla en el mapa
    console.log('🗺️ Intentando geocodificar dirección manual para el mapa...')
    await geocodeManualAddress(data)
    
  }, [onRealAddressUpdate, watchedFields, errors, geocodeManualAddress])

  // Debug: Monitorear valores del formulario en tiempo real
  useEffect(() => {
    console.log('📝 Form values changed:', watchedFields)
    console.log('📝 Form errors:', errors)
  }, [watchedFields, errors])

  return (
    <>
      {/* Estilos para el dropdown de AddressAutofill */}
      <style>
        {`
          /* GLOBAL: Forzar visibilidad de TODOS los contenedores de sugerencias de Mapbox */
          * {
            /* Asegurar que no hay overflow hidden que oculte las sugerencias */
          }
          
          body * {
            /* Forzar visibilidad global */
          }
          
          /* Animación para indicador de carga */
          @keyframes spin {
            0% { transform: translateY(-50%) rotate(0deg); }
            100% { transform: translateY(-50%) rotate(360deg); }
          }
          
          .coordinates-input {
            transition: all 0.2s ease !important;
          }
          
          .coordinates-input:focus {
            outline: none !important;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          }
          
          .coordinates-input.success:focus {
            border-color: #10b981 !important;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
          }
          
          .coordinates-input.error:focus {
            border-color: #ef4444 !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
          }
          
          /* Contenedor principal del autofill */
          .search-container {
            position: relative !important;
            z-index: 10000 !important;
            overflow: visible !important;
          }
          
          /* Asegurar que TODO el contenedor padre permita el overflow */
          .mapbox-form-section,
          .mapbox-page-container,
          .mapbox-content-grid,
          .address-form,
          .form,
          .form-group {
            overflow: visible !important;
            position: relative !important;
          }
          
          /* Input de búsqueda */
          .search-input {
            width: 100% !important;
            padding: 0.75rem !important;
            border: 1px solid #3b82f6 !important;
            border-radius: 6px !important;
            font-size: 0.875rem !important;
            background: #f9fafb !important;
            color: #1f2937 !important;
            position: relative !important;
            z-index: 1 !important;
          }
          
          /* Wrapper de AddressAutofill */
          [data-search-js-autofill] {
            position: relative !important;
            display: block !important;
            overflow: visible !important;
            z-index: 10000 !important;
          }
          
          /* SUPER GLOBAL: Todos los posibles contenedores de sugerencias */
          [data-search-js-autofill] *,
          [data-search-js-autofill] ul,
          [data-search-js-autofill] ol,
          [data-search-js-autofill] div,
          [data-search-js-autofill] .suggestions,
          [data-search-js-autofill] [class*="suggest"],
          [data-search-js-autofill] [class*="dropdown"],
          [data-search-js-autofill] [class*="result"],
          [data-search-js-autofill] [class*="list"],
          [data-search-js-autofill] [id*="suggest"],
          [data-search-js-autofill] > *,
          div[data-search-js-autofill] *,
          /* Clases específicas de Mapbox */
          .mapbox-search-autofill,
          .search-results,
          .suggestions-wrapper,
          [class*="mapbox"][class*="suggest"],
          [class*="search"][class*="suggest"],
          [id*="mapbox"][id*="suggest"],
          /* Intento directo con todas las posibles combinaciones */
          [data-search-js-autofill] > div > ul,
          [data-search-js-autofill] > div > div > ul,
          [data-search-js-autofill] ul[role="listbox"],
          [data-search-js-autofill] div[role="listbox"],
          [data-search-js-autofill] [role="listbox"] {
            position: absolute !important;
            top: 100% !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 10001 !important;
            background: white !important;
            border: 1px solid #d1d5db !important;
            border-top: none !important;
            border-radius: 0 0 8px 8px !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15) !important;
            max-height: 300px !important;
            overflow-y: auto !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
            /* Forzar que aparezca por encima de todo */
            transform: none !important;
            clip: none !important;
            clip-path: none !important;
          }
          
          /* Elementos de sugerencia individuales */
          [data-search-js-autofill] li,
          [data-search-js-autofill] .suggestion,
          [data-search-js-autofill] [class*="item"],
          [data-search-js-autofill] > * > *,
          .mapbox-search-autofill li,
          div[data-search-js-autofill] * li {
            padding: 12px 16px !important;
            cursor: pointer !important;
            border-bottom: 1px solid #f3f4f6 !important;
            transition: background-color 0.2s !important;
            background: white !important;
            color: #1f2937 !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
            display: block !important;
            margin: 0 !important;
            position: relative !important;
            z-index: 10002 !important;
          }
          
          /* Hover states */
          [data-search-js-autofill] li:hover,
          [data-search-js-autofill] .suggestion:hover,
          [data-search-js-autofill] [class*="item"]:hover,
          .mapbox-search-autofill li:hover {
            background-color: #f3f4f6 !important;
            color: #1f2937 !important;
          }

          /* Estilos para el estado de búsqueda */
          .search-status {
            margin-top: 0.5rem;
            padding: 0.5rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
          }

          .search-status.success {
            background: #dcfce7;
            border: 1px solid #bbf7d0;
            color: #166534;
          }

          .search-status.error {
            background: #fee2e2;
            border: 1px solid #fecaca;
            color: #dc2626;
          }

          .search-status.info {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            color: #1976d2;
          }
        `}
      </style>
      
      <div className="address-form">
        <h2>Información de Dirección</h2>
        
        {/* Estado simplificado - solo para éxito y error */}
        {searchStatus && searchStatus.type !== 'info' && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: searchStatus.type === 'success' ? '#e8f5e8' : '#ffebee',
            border: searchStatus.type === 'success' ? '1px solid #4caf50' : '1px solid #f44336',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px',
            color: searchStatus.type === 'success' ? '#2e7d32' : '#c62828'
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
                onSuggest={(e) => {
                  console.log('📝 AddressAutofill onSuggest triggered:', e)
                  console.log('📝 Number of suggestions:', e.suggestions ? e.suggestions.length : 0)
                  if (e.suggestions && e.suggestions.length > 0) {
                    console.log('📝 First suggestion:', e.suggestions[0])
                  }
                }}
                onClear={() => {
                  console.log('🧹 AddressAutofill onClear triggered')
                }}
                onError={(error) => {
                  console.error('❌ AddressAutofill error:', error)
                  setSearchStatus({
                    type: 'error',
                    message: '❌ Error al buscar direcciones'
                  })
                }}
                options={{
                  // Usar bounding box de Puerto Rico en lugar de country
                  bbox: [-67.945404, 17.881325, -65.220703, 18.515683], // Puerto Rico bbox
                  language: 'es',
                  proximity: [-66.590149, 18.220833], // Centro de Puerto Rico
                  // Tipos más amplios pero enfocados en direcciones
                  types: ['address', 'poi', 'place', 'postcode'],
                  limit: 8
                }}
              >
                <input
                  type="text"
                  placeholder="Ej: Calle Principal, KM 15.2 Carr 123, Barrio Pueblo, etc."
                  className="search-input"
                  onChange={handleInputChange}
                  autoComplete="address-line1"
                />
              </AddressAutofill>
              {searchStatus && searchStatus.type === 'info' && (
                <div className={`search-status ${searchStatus.type}`}>
                  <span>{searchStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Campo para búsqueda por coordenadas */}
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label htmlFor="coordinates" style={{ fontWeight: '500', color: '#374151', marginBottom: '4px', display: 'block', fontSize: '0.875rem' }}>
              Ingresar Coordenadas Directamente
            </label>
            <small style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '8px', display: 'block' }}>
              Formato: <code>"18.219107, -66.225394"</code> - Se validará automáticamente para Puerto Rico
            </small>
            
            <div className="coordinates-container" style={{ position: 'relative' }}>
              <input
                type="text"
                id="coordinates"
                value={manualCoordinates}
                onChange={handleCoordinatesChange}
                placeholder="18.219107, -66.225394"
                className={`coordinates-input ${coordinatesError ? 'error' : ''} ${manualCoordinates && !coordinatesError && !isValidatingCoords ? 'success' : ''}`}
                disabled={isValidatingCoords}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: isValidatingCoords || (manualCoordinates && !coordinatesError) ? '50px' : '12px',
                  border: coordinatesError ? '1px solid #ef4444' : 
                          (manualCoordinates && !coordinatesError && !isValidatingCoords) ? '1px solid #10b981' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: isValidatingCoords ? '#f9fafb' : 'white',
                  color: '#1f2937',
                  transition: 'all 0.2s ease'
                }}
              />
              
              {/* Indicador de estado dentro del input */}
              {isValidatingCoords && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1rem',
                  animation: 'spin 1s linear infinite'
                }}>
                  ⏳
                </div>
              )}
              
              {manualCoordinates && !coordinatesError && !isValidatingCoords && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1rem',
                  color: '#10b981'
                }}>
                  ✅
                </div>
              )}
              
              {/* Mensajes de estado debajo del input */}
              {isValidatingCoords && (
                <div className="coordinates-loading" style={{ 
                  marginTop: '6px', 
                  fontSize: '0.75rem', 
                  color: '#0ea5e9',
                  padding: '4px 8px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  🌐 <span>Procesando coordenadas y ubicando en el mapa...</span>
                </div>
              )}
              
              {coordinatesError && (
                <div className="coordinates-error" style={{ 
                  marginTop: '6px', 
                  fontSize: '0.75rem', 
                  color: '#ef4444',
                  padding: '4px 8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px'
                }}>
                  {coordinatesError}
                </div>
              )}
              
              {manualCoordinates && !coordinatesError && !isValidatingCoords && (
                <div className="coordinates-success" style={{ 
                  marginTop: '6px', 
                  fontSize: '0.75rem', 
                  color: '#10b981',
                  padding: '4px 8px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #bbf7d0',
                  borderRadius: '4px'
                }}>
                  ✅ <span>Coordenadas válidas - ubicación procesada</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="line1">Dirección Línea 1 *</label>
            <Controller
              name="line1"
              control={control}
              rules={{ required: 'Este campo es requerido' }}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  id="line1"
                  autoComplete="address-line1"
                  placeholder="Ej: Calle Principal 123"
                />
              )}
            />
            {errors.line1 && <span className="error">{errors.line1.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="line2">Dirección Línea 2</label>
            <Controller
              name="line2"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  id="line2"
                  autoComplete="address-line2"
                  placeholder="Apartamento, suite, etc. (opcional)"
                />
              )}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="municipio">Municipio *</label>
              <Controller
                name="municipio"
                control={control}
                rules={{ required: 'Selecciona un municipio' }}
                render={({ field }) => (
                  <select
                    {...field}
                    id="municipio"
                    disabled={isLoadingMunicipios}
                  >
                    <option value="">
                      {isLoadingMunicipios ? 'Cargando municipios...' : 'Selecciona municipio'}
                    </option>
                    {municipios.filter(municipio => typeof municipio === 'string' && municipio.trim()).map((municipio, index) => (
                      <option key={`${municipio}-${index}`} value={municipio}>{municipio}</option>
                    ))}
                  </select>
                )}
              />
              {errors.municipio && <span className="error">{errors.municipio.message}</span>}
              {!isLoadingMunicipios && municipios.length > 0 && (
                <small style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  ✅ {municipios.length} municipios de Puerto Rico disponibles
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="zipCode">Código Postal *</label>
              <Controller
                name="zipCode"
                control={control}
                rules={{ 
                  required: 'El código postal es requerido',
                  pattern: {
                    value: /^\d{5}(-\d{4})?$/,
                    message: 'Formato inválido. Usar 00000 o 00000-0000'
                  }
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    id="zipCode"
                    autoComplete="postal-code"
                    placeholder="00000"
                  />
                )}
              />
              {errors.zipCode && <span className="error">{errors.zipCode.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="state">Estado</label>
            <Controller
              name="state"
              control={control}
              defaultValue="Puerto Rico"
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  id="state"
                  placeholder="Estado o territorio"
                  style={{ backgroundColor: '#f9fafb' }}
                />
              )}
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              style={{ width: '100%' }}
              disabled={isGeocodingManual || isValidatingCoords}
            >
              {isGeocodingManual ? '🗺️ Ubicando en mapa...' : 
               isValidatingCoords ? '🌐 Procesando coordenadas...' : 
               'Confirmar Dirección'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default MapboxAddressFormClean
