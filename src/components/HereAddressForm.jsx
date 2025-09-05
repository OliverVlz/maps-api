import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'

function HereAddressForm({ 
  addressData, 
  setAddressData, 
  onLocationSelect, 
  onRealAddressUpdate, 
  onCoordinatesDataUpdate 
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: addressData
  })
  
  // Estados para autocompletado y sugerencias
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSelectingAddress, setIsSelectingAddress] = useState(false)
  const [searchStatus, setSearchStatus] = useState(null)
  // const [submittedData, setSubmittedData] = useState(null)
  
  // Estados para coordenadas manuales
  const [manualCoordinates, setManualCoordinates] = useState('')
  const [coordinatesData, setCoordinatesData] = useState(null)
  const [coordinatesError, setCoordinatesError] = useState('')
  const [isValidatingCoords, setIsValidatingCoords] = useState(false)
  const [hasSelectedSuggestion, setHasSelectedSuggestion] = useState(false)
  
  // Estados para municipios dinámicos
  const [municipios, setMunicipios] = useState([])
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false)
  const [municipiosSource, setMunicipiosSource] = useState(null)
  
  const searchInputRef = useRef(null)
  const debounceTimeoutRef = useRef(null)
  const currentQueryRef = useRef('')

  const watchedFields = watch()

  // Cargar municipios al montar el componente
  useEffect(() => {
    const loadMunicipios = async () => {
      setIsLoadingMunicipios(true)
      
      try {
              // Cargar directamente desde archivo local (más confiable)
      try {
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
          console.log('✅ HERE - Municipios cargados desde archivo local:', municipiosFromLocal.length)
          return
        }
      } catch (localError) {
        console.warn('⚠️ HERE - Error cargando archivo local:', localError.message)
      }
      } catch (error) {
        console.log('⚠️ HERE - No se pudo cargar desde Census Bureau:', error.message)
        
        try {
          // Opción 2: Fallback a archivo local (rápido y confiable)
          const localResponse = await fetch('/data/municipios-pr.json')
          
          if (localResponse.ok) {
            const localData = await localResponse.json()
            
            if (localData.municipios && Array.isArray(localData.municipios)) {
              const municipiosFromLocal = localData.municipios
                .map(m => m.name)
                .sort()
              
              setMunicipios(municipiosFromLocal)
              setMunicipiosSource('local-json')
              console.log('✅ HERE - Municipios cargados desde archivo local (fallback):', municipiosFromLocal.length)
              setIsLoadingMunicipios(false)
              return
            }
          }
          
          throw new Error('Archivo local no disponible')
        } catch (error2) {
          console.log('❌ HERE - Error: No se pudieron cargar municipios desde ninguna fuente:', error2.message)
          setIsLoadingMunicipios(false)
        }
      }
    }

    loadMunicipios()

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  // Sincronizar el formulario cuando addressData cambie desde el componente padre
  // Solo al inicializar, no crear bucles
  useEffect(() => {
    console.log('🔄 HERE - useEffect - addressData inicial recibido del padre:', addressData)
    if (addressData) {
      setValue('linea1', addressData.linea1 || '')
      setValue('linea2', addressData.linea2 || '')
      setValue('municipio', addressData.municipio || '')
      setValue('barrio', addressData.barrio || '')
      setValue('descripcion', addressData.descripcion || '')
      console.log('✅ HERE - Formulario sincronizado con addressData inicial del padre:', addressData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo al montar el componente

  // Función para formatear direcciones de manera organizada
  const formatAddressForDisplay = (addressData) => {
    const parts = []
    if (addressData.linea1) parts.push(addressData.linea1)
    if (addressData.municipio) parts.push(addressData.municipio)
    if (addressData.barrio) parts.push(addressData.barrio)
    return parts.join(' | ')
  }

  // Función para mejorar el procesamiento de direcciones rurales de PR
  const preprocessPuertoRicanAddress = (address) => {
    if (!address) return address
    
    let processedAddress = address.trim()
    
    // Mejorar formato de carreteras rurales
    // "Carr 123 KM 15.2" -> "Carretera 123 Kilómetro 15.2"
    processedAddress = processedAddress.replace(/\bcarr\.?\s*(\d+)\s*km\.?\s*([\d.]+)/gi, 'Carretera $1 Kilómetro $2')
    
    // "PR-123 KM 15.2" -> "Carretera PR-123 Kilómetro 15.2"
    processedAddress = processedAddress.replace(/\bPR-(\d+)\s*km\.?\s*([\d.]+)/gi, 'Carretera PR-$1 Kilómetro $2')
    
    // Mejorar formato de barrios
    // "Bo. Naranjo" -> "Barrio Naranjo"
    processedAddress = processedAddress.replace(/\bbo\.?\s+/gi, 'Barrio ')
    
    // "Sect. La Esperanza" -> "Sector La Esperanza"
    processedAddress = processedAddress.replace(/\bsect\.?\s+/gi, 'Sector ')
    
    // "Urb. Las Flores" -> "Urbanización Las Flores"
    processedAddress = processedAddress.replace(/\burb\.?\s+/gi, 'Urbanización ')
    
    // "Res. Villa Rica" -> "Residencial Villa Rica"
    processedAddress = processedAddress.replace(/\bres\.?\s+/gi, 'Residencial ')
    
    // Asegurar que Puerto Rico esté al final si no está presente
    if (!processedAddress.toLowerCase().includes('puerto rico') && !processedAddress.toLowerCase().includes(', pr')) {
      processedAddress += ', Puerto Rico'
    }
    
    return processedAddress
  }

  // Función para hacer búsquedas con HERE API
  const searchAddress = (query) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    if (query.length < 3) {
      setSuggestions([])
      setSearchStatus(null)
      setIsSearching(false)
      setHasSelectedSuggestion(false)
      return
    }

    setIsSearching(true)
    setSearchStatus(null)
    setHasSelectedSuggestion(false)

    // Detectar si el usuario incluyó barrio manualmente en la búsqueda
    const barrioInQuery = query.match(/\b(?:bo\.?|barrio)\s+([^,]+)/i)
    if (barrioInQuery) {
      console.log('🏘️ HERE - Barrio detectado en búsqueda:', barrioInQuery[1].trim())
    }

    // Guardar la query original para usar en selectAddress
    currentQueryRef.current = query

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const apiKey = import.meta.env.VITE_HERE_API_KEY
        if (!apiKey) {
          throw new Error('HERE API Key no configurada')
        }

        const encodedQuery = encodeURIComponent(`${query}, Puerto Rico`)
        const url = `https://autosuggest.search.hereapi.com/v1/autosuggest?q=${encodedQuery}&at=18.2208,-66.5901&limit=5&lang=es&in=countryCode:PRI&apiKey=${apiKey}`

        console.log('🔍 HERE - Buscando:', query)
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Error en búsqueda: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log('📍 HERE - Respuesta de búsqueda:', data)

        if (data.items && data.items.length > 0) {
          const hereSuggestions = data.items.map((item, index) => ({
            place_id: `here_${index}_${Date.now()}`,
            description: item.title,
            title: item.title,
            address: item.address,
            position: item.position,
            resultType: item.resultType,
            hereId: item.id
          }))

          setSuggestions(hereSuggestions)
          setShowSuggestions(true)
          setSearchStatus({ 
            type: 'success', 
            message: `✅ ${hereSuggestions.length} sugerencias encontradas con HERE Maps` 
          })
          console.log('✅ HERE - Sugerencias encontradas:', hereSuggestions.length)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
          setSearchStatus({ 
            type: 'warning', 
            message: '⚠️ No se encontraron sugerencias para esta búsqueda' 
          })
        }
      } catch (error) {
        console.error('❌ HERE - Error en búsqueda:', error)
        setSuggestions([])
        setShowSuggestions(false)
        setSearchStatus({ 
          type: 'error', 
          message: `❌ Error en búsqueda: ${error.message}` 
        })
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  // Función para seleccionar una dirección de las sugerencias
  const selectAddress = async (placeId) => {
    setIsSelectingAddress(true)
    setShowSuggestions(false)
    setHasSelectedSuggestion(true)
    
    try {
      const suggestion = suggestions.find(s => s.place_id === placeId)
      if (!suggestion) {
        throw new Error('Sugerencia no encontrada')
      }

      console.log('📍 HERE - Sugerencia seleccionada:', suggestion)

      // Si la sugerencia tiene posición, actualizar mapa directamente
      if (suggestion.position) {
        const location = { 
          lat: suggestion.position.lat, 
          lng: suggestion.position.lng 
        }
        
        onLocationSelect(location)
        
        // Hacer reverse geocoding para obtener dirección real
        await reverseGeocodeWithFetch(location)
      } else {
        // Si no tiene posición, hacer geocoding
        await geocodeAddressWithFetch(suggestion.title)
      }

      // Actualizar datos del formulario con setValue para que se vean en la UI
      if (suggestion.address?.street || suggestion.title) {
        setValue('linea1', suggestion.address?.street || suggestion.title || '')
      }
      if (suggestion.address?.district) {
        setValue('barrio', suggestion.address?.district || '')
      }
      if (suggestion.address?.city) {
        setValue('municipio', suggestion.address?.city || '')
      }

      // Limpiar el campo de búsqueda y poner la dirección seleccionada
      if (searchInputRef.current) {
        searchInputRef.current.value = suggestion.title || ''
      }

      // También actualizar addressData para mantener sincronización con el padre
      const newData = {
        ...watchedFields,
        linea1: suggestion.address?.street || suggestion.title || watchedFields.linea1 || '',
        barrio: suggestion.address?.district || watchedFields.barrio || '',
        municipio: suggestion.address?.city || watchedFields.municipio || ''
      }
      
      setAddressData(newData)
      
    } catch (error) {
      console.error('❌ HERE - Error al seleccionar sugerencia:', error)
    } finally {
      setIsSelectingAddress(false)
    }
  }

  // Función para hacer geocoding con HERE API usando fetch
  const geocodeAddressWithFetch = async (address) => {
    try {
      const apiKey = import.meta.env.VITE_HERE_API_KEY
      if (!apiKey) {
        throw new Error('HERE API Key no configurada')
      }

      console.log('🔍 HERE - Iniciando geocoding con fetch:', address)

      const encodedAddress = encodeURIComponent(`${address}, Puerto Rico`)
      const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodedAddress}&apiKey=${apiKey}&in=countryCode:PRI&limit=1`

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error en geocoding: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📍 HERE - Respuesta de geocoding:', data)

      if (data.items && data.items.length > 0) {
        const result = data.items[0]
        const position = result.position
        
        if (position && position.lat && position.lng) {
          const location = { lat: position.lat, lng: position.lng }
          
          // Actualizar ubicación
          onLocationSelect(location)
          
          // Hacer reverse geocoding para obtener la dirección "real"
          await reverseGeocodeWithFetch(location)
          
          console.log('✅ HERE - Geocoding completado:', location)
          return location
        }
      }
      
      throw new Error('No se encontraron resultados en geocoding')
    } catch (error) {
      console.error('❌ HERE - Error en geocoding:', error)
      throw error
    }
  }

  // Función para hacer reverse geocoding
  const reverseGeocodeWithFetch = async (location) => {
    try {
      const apiKey = import.meta.env.VITE_HERE_API_KEY
      if (!apiKey) {
        throw new Error('HERE API Key no configurada')
      }

      console.log('🔄 HERE - Iniciando reverse geocoding:', location)
      
      const url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${location.lat},${location.lng}&lang=es&apiKey=${apiKey}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error en reverse geocoding: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('🗺️ HERE - Respuesta de reverse geocoding:', data)

      if (data.items && data.items.length > 0) {
        const result = data.items[0]
        const address = result.address
        
        const realAddressData = {
          coordenadas: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
          direccion_completa: result.title || 'Dirección no disponible',
          municipio: address?.city || '',
          barrio: address?.district || address?.subdistrict || '',
          componentes: address
        }
        
        onRealAddressUpdate?.(realAddressData)
        console.log('🌍 HERE - DIRECCIÓN REAL de las coordenadas:', realAddressData)
      }
    } catch (error) {
      console.error('❌ HERE - Error en reverse geocoding:', error)
    }
  }

  // Función para validar coordenadas
  const validateCoordinates = (coordString) => {
    // Limpiar el string
    const cleaned = coordString.trim().replace(/\s+/g, ' ')
    
    // Patrones para diferentes formatos de coordenadas
    const patterns = [
      // lat, lng (decimal)
      /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/,
      // lat lng (sin coma)
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/,
      // lat,lng (sin espacios)
      /^(-?\d+\.?\d*),(-?\d+\.?\d*)$/
    ]
    
    for (let pattern of patterns) {
      const match = cleaned.match(pattern)
      if (match) {
        const lat = parseFloat(match[1])
        const lng = parseFloat(match[2])
        
        // Validar rangos de Puerto Rico aproximados
        // PR está entre: 17.9°N - 18.6°N, 65.2°W - 67.3°W
        if (lat >= 17.8 && lat <= 18.7 && lng >= -67.5 && lng <= -65.0) {
          return { lat, lng, valid: true, error: null }
        } else {
          return { 
            valid: false, 
            error: 'Coordenadas fuera de Puerto Rico. Usa: Lat 17.8-18.7, Lng -67.5 a -65.0' 
          }
        }
      }
    }
    
    return { 
      valid: false, 
      error: 'Formato inválido. Usa: "18.219107, -66.225394"' 
    }
  }

  // Función para manejar input de coordenadas manuales
  const handleCoordinatesInput = async (value) => {
    setManualCoordinates(value)
    
    if (!value.trim()) {
      setCoordinatesError('')
      setCoordinatesData(null)
      return
    }

    const validation = validateCoordinates(value)
    
    if (!validation.valid) {
      setCoordinatesError(validation.error)
      setCoordinatesData(null)
      return
    }

    setCoordinatesError('')
    setIsValidatingCoords(true)

    try {
      const { lat, lng } = validation

      const location = { lat, lng }
      
      // Actualizar ubicación en el mapa
      onLocationSelect(location)
      
      // Hacer reverse geocoding
      await reverseGeocodeWithFetch(location)
      
      // Crear datos detallados de coordenadas
      const detailedCoordinatesData = {
        coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        precision: { level: 'Manual', description: 'Coordenadas ingresadas manualmente' },
        lat: lat,
        lng: lng
      }
      setCoordinatesData(detailedCoordinatesData)
      onCoordinatesDataUpdate?.(detailedCoordinatesData)
      
      console.log('✅ HERE - Coordenadas validadas:', location)
      
    } catch (error) {
      console.error('❌ HERE - Error validando coordenadas:', error)
      setCoordinatesError('Error al validar coordenadas')
    } finally {
      setIsValidatingCoords(false)
    }
  }

  // Función para geocodificar la dirección del formulario manualmente
  // const geocodeFormAddress = async () => {
  //   const currentData = watchedFields
  //   const fullAddressParts = []
  //   
  //   if (currentData.linea1) fullAddressParts.push(currentData.linea1)
  //   if (currentData.linea2) fullAddressParts.push(currentData.linea2)
  //   if (currentData.barrio) fullAddressParts.push(currentData.barrio)
  //   if (currentData.municipio) fullAddressParts.push(currentData.municipio + ', PR')

  //   if (fullAddressParts.length === 0) {
  //     setSearchStatus({ 
  //       type: 'warning', 
  //       message: '⚠️ Por favor llena al menos la dirección línea 1 para buscar en el mapa' 
  //     })
  //     return
  //   }

  //   const fullAddress = fullAddressParts.join(', ')
  //   const processedAddress = preprocessPuertoRicanAddress(fullAddress)

  //   console.log('🔍 HERE - Geocodificando dirección del formulario:', fullAddress)
  //   console.log('🔄 HERE - Dirección procesada para HERE Maps:', processedAddress)

  //   setSearchStatus({ 
  //     type: 'info', 
  //     message: '🔍 Buscando tu dirección en el mapa...' 
  //   })

  //   try {
  //     await geocodeAddressWithFetch(processedAddress)
  //     setSearchStatus({ 
  //       type: 'success', 
  //       message: '✅ Dirección encontrada y ubicada en el mapa' 
  //     })
  //   } catch (error) {
  //     console.error('❌ HERE - Error en geocodificación del formulario:', error)
  //     setSearchStatus({ 
  //       type: 'error', 
  //       message: '❌ No se pudo encontrar esta dirección en el mapa' 
  //     })
  //   }
  // }

  // Función para manejar envío del formulario
  const onSubmit = async (data) => {
    try {
      console.log('📝 HERE - Datos del formulario enviados:', data)
      
      setAddressData(data)
      // setSubmittedData({
      //   ...data,
      //   timestamp: new Date().toLocaleString()
      // })
      setSearchStatus({ 
        type: 'success', 
        message: `✅ Formulario enviado | ${formatAddressForDisplay(data)}` 
      })
      
      // Si no se ha seleccionado una sugerencia ni se han ingresado coordenadas manuales,
      // intentar geocodificación directa de la dirección del formulario
      if (!hasSelectedSuggestion && !manualCoordinates) {
        const fullAddressParts = []
        if (data.linea1) fullAddressParts.push(data.linea1)
        if (data.linea2) fullAddressParts.push(data.linea2)
        if (data.barrio) fullAddressParts.push(data.barrio)
        if (data.municipio) fullAddressParts.push(data.municipio + ', PR')

        const fullAddress = fullAddressParts.join(', ')
        const processedAddress = preprocessPuertoRicanAddress(fullAddress)

        console.log('🔍 HERE - Intentando geocodificación directa de:', fullAddress)
        console.log('🔄 HERE - Dirección procesada para HERE Maps:', processedAddress)

        try {
          await geocodeAddressWithFetch(processedAddress)
        } catch {
          console.log('❌ HERE - No se pudo geocodificar la dirección del formulario')
        }
      }
      
    } catch (error) {
      console.error('❌ HERE - Error en envío:', error)
    }
  }

  // Actualizar datos cuando cambien los campos (con debounce para evitar bucles)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAddressData(watchedFields)
    }, 100) // Pequeño delay para evitar bucles

    return () => clearTimeout(timeoutId)
  }, [watchedFields, setAddressData])

  return (
    <div className="address-form">
      <h2>Información de Dirección</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <div className="form-group">
          <label htmlFor="busqueda">Buscar Ubicación</label>
          <small style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block' }}>
            Busca direcciones urbanas, rurales (KM), barrios, sectores, negocios, puntos de referencia con HERE Maps
          </small>
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Ej: Calle Principal, KM 15.2 Carr 123, Barrio Pueblo, etc."
              onChange={(e) => searchAddress(e.target.value)}
              className="search-input"
              disabled={isSelectingAddress}
            />
            {isSearching && (
              <div className="search-loading">
                <span>Buscando direcciones con HERE Maps...</span>
              </div>
            )}
            {isSelectingAddress && (
              <div className="search-loading">
                <span>Obteniendo detalles de la dirección...</span>
              </div>
            )}
            {searchStatus && (
              <div className={`search-status ${searchStatus.type}`}>
                <span>{searchStatus.message}</span>
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((suggestion) => (
                  <li
                    key={suggestion.place_id}
                    onClick={() => selectAddress(suggestion.place_id)}
                    className="suggestion-item"
                  >
                    {suggestion.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="coordinates">Ingresar Coordenadas Directamente</label>
          <small style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block' }}>
            Formato: "18.219107, -66.225394" - Se validará automáticamente para Puerto Rico
          </small>
          <div className="coordinates-container">
            <input
              type="text"
              value={manualCoordinates}
              onChange={(e) => handleCoordinatesInput(e.target.value)}
              placeholder="18.219107, -66.225394"
              className={`coordinates-input ${coordinatesError ? 'error' : ''} ${coordinatesData ? 'success' : ''}`}
              disabled={isValidatingCoords}
            />
            {isValidatingCoords && (
              <div className="coordinates-loading">
                <span>Validando coordenadas...</span>
              </div>
            )}
            {coordinatesError && (
              <div className="coordinates-error">
                <span>❌ {coordinatesError}</span>
              </div>
            )}
            {coordinatesData && (
              <div className="coordinates-success">
                <span>✅ Coordenadas válidas - {coordinatesData.precision.level} precisión</span>
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
            placeholder="Apartamento, suite, etc. (opcional)"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="municipio">Municipio *</label>
            <select
              {...register('municipio', { required: 'Selecciona un municipio' })}
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
            {errors.municipio && <span className="error">{errors.municipio.message}</span>}
            {municipiosSource !== 'fallback' && (
              <small style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                ✅ Municipios cargados desde {
                  municipiosSource === 'census-bureau' ? 'Census Bureau (oficial)' :
                  municipiosSource === 'local-json' ? 'archivo local (fallback)' :
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
              placeholder="Ej: Pueblo, Centro, etc."
            />
            <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
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
            🔍 Buscar Dirección
          </button>
        </div>
      </form>

      <details className="address-help">
        <summary><h4>📋 Ejemplos de Direcciones de Puerto Rico</h4></summary>
        <div className="help-content">
          <div className="help-section">
            <h5>🏙️ Direcciones Urbanas (Copia y pega en búsqueda):</h5>
            <div className="examples-grid">
              <div className="example-item">
                <code>Plaza de Armas Caguas</code>
              </div>
              <div className="example-item">
                <code>Escuela José de Diego Cayey</code>
              </div>
              <div className="example-item">
                <code>Centro de Salud Comerío</code>
              </div>
              <div className="example-item">
                <code>Iglesia San José Cidra</code>
              </div>
            </div>
          </div>
          
          <div className="help-section">
            <h5>🛣️ Direcciones Rurales con Carreteras:</h5>
            <div className="examples-grid">
              <div className="example-item">
                <strong>Carreteras Estatales:</strong><br />
                <code>PR-123 KM 15.2, Ciales</code><br />
                <code>PR-156 KM 32.1, Comerío</code><br />
                <code>PR-152 KM 18.5, Barranquitas</code>
              </div>
              <div className="example-item">
                <strong>Carreteras Municipales:</strong><br />
                <code>Carr 156 KM 8.5, Bo. Naranjo, Comerío</code><br />
                <code>Carretera 162 KM 18.5, Bo. Juan Asencio, Aguas Buenas</code><br />
                <code>KM 41.2 Carr 143, Bo. Helechal, Barranquitas</code>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h5>🏔️ Zonas Montañosas (Cordillera Central):</h5>
            <div className="examples-grid">
              <div className="example-item">
                <code>KM 15.7 PR-511, Bo. Jájome Alto, Cayey</code>
              </div>
              <div className="example-item">
                <code>Carr 156 KM 28.3, Bo. Damián Arriba, Comerío</code>
              </div>
              <div className="example-item">
                <code>PR-152 KM 22.8, Bo. Farallón, Cidra</code>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h5>🌍 Coordenadas para Probar:</h5>
            <div className="examples-grid">
              <div className="example-item">
                <strong>Caguas rural:</strong><br />
                <code>18.238889, -66.150000</code>
              </div>
              <div className="example-item">
                <strong>Cayey montañoso:</strong><br />
                <code>18.180000, -66.330000</code>
              </div>
              <div className="example-item">
                <strong>Comerío rural:</strong><br />
                <code>18.255000, -66.225000</code>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h5>📝 Ejemplos de Formularios Completos:</h5>
            <div className="form-examples">
              <div className="form-example">
                <strong>🏘️ Rural Típico:</strong><br />
                <small>Línea 1:</small> <code>Carr 156 KM 8.5</code><br />
                <small>Municipio:</small> <code>Comerío</code><br />
                <small>Barrio:</small> <code>Naranjo</code>
              </div>
              <div className="form-example">
                <strong>🛣️ Carretera Estatal:</strong><br />
                <small>Línea 1:</small> <code>PR-152 KM 18.5</code><br />
                <small>Municipio:</small> <code>Barranquitas</code><br />
                <small>Barrio:</small> <em>(dejar vacío)</em>
              </div>
              <div className="form-example">
                <strong>🏙️ Urbano:</strong><br />
                <small>Línea 1:</small> <code>Calle Luna 45</code><br />
                <small>Municipio:</small> <code>Ponce</code><br />
                <small>Barrio:</small> <code>Playa</code>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h5>� Tips de Uso:</h5>
            <ul>
              <li>🔍 <strong>Búsqueda rápida:</strong> Copia cualquier ejemplo y pégalo en "Buscar Ubicación"</li>
              <li>📍 <strong>Coordenadas:</strong> Pega las coordenadas en "Ingresar Coordenadas Directamente"</li>
              <li>📝 <strong>Formulario manual:</strong> Llena los campos como se muestra en los ejemplos</li>
              <li>🗺️ <strong>Variaciones:</strong> Puedes usar "KM 15.2 Carr 123" o "Carr 123 KM 15.2"</li>
              <li>⚠️ <strong>Validación:</strong> El sistema te avisará si hay discrepancias en municipio/barrio</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  )
}

export default HereAddressForm
