import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'

function GoogleAddressForm({ 
  addressData, 
  setAddressData, 
  onLocationSelect, 
  onRealAddressUpdate, 
  onCoordinatesDataUpdate
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: addressData
  })
  
  const sessionTokenRef = useRef(crypto.randomUUID())
  
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSelectingAddress, setIsSelectingAddress] = useState(false)
  const [searchStatus, setSearchStatus] = useState(null)
  
  const [manualCoordinates, setManualCoordinates] = useState('')
  const [coordinatesData, setCoordinatesData] = useState(null)
  const [coordinatesError, setCoordinatesError] = useState('')
  const [isValidatingCoords, setIsValidatingCoords] = useState(false)
  const [hasSelectedSuggestion, setHasSelectedSuggestion] = useState(false)
  
  const [municipios, setMunicipios] = useState([])
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false)
  const [municipiosSource, setMunicipiosSource] = useState(null)
  
  const searchInputRef = useRef(null)
  const debounceTimeoutRef = useRef(null)
  const currentQueryRef = useRef('')

  const watchedFields = watch()

  useEffect(() => {
    const loadMunicipios = async () => {
      setIsLoadingMunicipios(true)
      
      try {
        // Intentar con Census Bureau API primero (fuente oficial)
        const censusResponse = await fetch('https://api.census.gov/data/2020/dec/pl?get=NAME&for=county:*&in=state:72')
        
        if (censusResponse.ok) {
          const censusData = await censusResponse.json()
          
          if (Array.isArray(censusData) && censusData.length > 1) {
            const municipiosFromCensus = censusData
              .slice(1)
              .map(row => {
                const fullName = row[0]
                const municipioName = fullName.replace(' Municipio, Puerto Rico', '')
                return municipioName
              })
              .filter(name => name && name.length > 0)
              .sort()
            
            setMunicipios(municipiosFromCensus)
            setMunicipiosSource('census-bureau')
            setIsLoadingMunicipios(false)
            return
          }
        }
        
        throw new Error('Census Bureau API no disponible')
      } catch {
        try {
          // Fallback a archivo local
          const localResponse = await fetch('/data/municipios-pr.json')
          
          if (localResponse.ok) {
            const localData = await localResponse.json()
            
            if (localData.municipios && Array.isArray(localData.municipios)) {
              const municipiosFromLocal = localData.municipios
                .map(m => m.name)
                .sort()
              
              setMunicipios(municipiosFromLocal)
              setMunicipiosSource('local-json')
              setIsLoadingMunicipios(false)
              return
            }
          }
          
          throw new Error('Archivo local no disponible')
        } catch {
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

  useEffect(() => {
    if (addressData) {
      setValue('linea1', addressData.linea1 || '')
      setValue('linea2', addressData.linea2 || '')
      setValue('municipio', addressData.municipio || '')
      setValue('barrio', addressData.barrio || '')
      setValue('descripcion', addressData.descripcion || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatAddressForDisplay = (addressData) => {
    const parts = []
    if (addressData.linea1) parts.push(addressData.linea1)
    if (addressData.municipio) parts.push(addressData.municipio)
    if (addressData.barrio) parts.push(addressData.barrio)
    return parts.join(' | ')
  }

  const preprocessPuertoRicanAddress = (address) => {
    if (!address) return address
    
    let processedAddress = address.trim()
    
    if (/^km\.?\s*\d+\.?\d*$/i.test(processedAddress)) {
      processedAddress = processedAddress.replace(/^km\.?\s*(\d+\.?\d*)$/i, 'kilómetro $1') + ', Puerto Rico'
    }
    
    processedAddress = processedAddress.replace(/\bcarr\.?\s*(\d+)\s*km\.?\s*([\d.]+)/gi, 'Carretera $1 Kilómetro $2')
    
    processedAddress = processedAddress.replace(/\bPR-(\d+)\s*km\.?\s*([\d.]+)/gi, 'Carretera PR-$1 Kilómetro $2')
    
    processedAddress = processedAddress.replace(/\bbo\.?\s+/gi, 'Barrio ')
    
    processedAddress = processedAddress.replace(/\bsect\.?\s+/gi, 'Sector ')
    
    processedAddress = processedAddress.replace(/\burb\.?\s+/gi, 'Urbanización ')
    
    processedAddress = processedAddress.replace(/\bres\.?\s+/gi, 'Residencial ')
    
    if (!processedAddress.toLowerCase().includes('puerto rico') && !processedAddress.toLowerCase().includes(', pr')) {
      processedAddress += ', Puerto Rico'
    }
    
    return processedAddress
  }

  const searchAddress = (query) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    if (query.length < 3) {
      setSuggestions([]); setShowSuggestions(false);
      setIsSearching(false); setSearchStatus(null);
      return;
    }

    setIsSearching(true); setSearchStatus(null);
    currentQueryRef.current = query;

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) throw new Error('Configura VITE_GOOGLE_MAPS_API_KEY');

        const processedQuery = preprocessPuertoRicanAddress(query);

        const body = {
          input: processedQuery,
          includedRegionCodes: ["PR"],
          regionCode: "PR",
          sessionToken: sessionTokenRef.current,
          locationBias: {
            circle: {
              center: { latitude: 18.2208, longitude: -66.5901 },
              radius: 50000.0
            }
          },
          languageCode: "es"
        };

        const resp = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text"
          },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const errorText = await resp.text()
          
          if (resp.status === 403) {
            const isRefererError = errorText.includes('referer') || errorText.includes('Referer');
            const isAPINotEnabled = errorText.includes('API') && errorText.includes('not enabled');
            
            if (isRefererError) {
              throw new Error('Error 403: Configura los referrers HTTP en Google Cloud Console para localhost');
            } else if (isAPINotEnabled) {
              throw new Error('Error 403: Habilita "Places API (New)" en Google Cloud Console');
            } else {
              throw new Error(`Error 403: ${errorText}`);
            }
          }
          throw new Error(`Autocomplete error ${resp.status}: ${errorText}`);
        }

        const data = await resp.json();

        const list = (data.suggestions || [])
          .filter(s => s.placePrediction)
          .map((s, idx) => ({
            place_id: s.placePrediction.placeId || `ac_${idx}`,
            description: s.placePrediction.text?.text || ""
          }));

        setSuggestions(list);
        setShowSuggestions(list.length > 0);
        setSearchStatus(list.length
          ? { type: "success", message: `✅ ${list.length} sugerencias` }
          : { type: "warning", message: "⚠️ Sin sugerencias" });
      } catch (e) {
        setSuggestions([]); setShowSuggestions(false);
        setSearchStatus({ type: "error", message: `❌ ${e.message}` });
      } finally {
        setIsSearching(false);
      }
    }, 250);
  }

  const selectAddress = async (placeId) => {
    setIsSelectingAddress(true);
    setShowSuggestions(false);
    setHasSelectedSuggestion(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) throw new Error('API Key no configurada');

      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents",
        }
      });

      if (!resp.ok) throw new Error(`Details error ${resp.status}`);

      const place = await resp.json();

      const coords = place.location
        ? { lat: place.location.latitude, lng: place.location.longitude }
        : null;

      if (coords) onLocationSelect(coords);

      let street = "", city = "", district = "";
      (place.addressComponents || []).forEach(c => {
        const types = c.types || [];
        if (types.includes("route") || types.includes("street_address")) {
          street = c.longText || c.shortText || street;
        }
        if (types.includes("locality") || types.includes("administrative_area_level_2")) {
          city = c.longText || c.shortText || city;
        }
        if (types.includes("sublocality") || types.includes("neighborhood")) {
          district = c.longText || c.shortText || district;
        }
      });

      setValue("linea1", street || place.displayName?.text || place.formattedAddress || "");
      if (district) setValue("barrio", district);
      if (city) setValue("municipio", city);

      if (searchInputRef.current) {
        searchInputRef.current.value = place.formattedAddress || place.displayName?.text || "";
      }

      setAddressData({
        ...watchedFields,
        linea1: street || place.displayName?.text || place.formattedAddress || watchedFields.linea1 || "",
        barrio: district || watchedFields.barrio || "",
        municipio: city || watchedFields.municipio || ""
      });

      if (coords) {
        const realAddressData = {
          coordenadas: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
          direccion_completa: place.formattedAddress || 'Dirección no disponible',
          municipio: city,
          barrio: district,
          componentes: place.addressComponents
        }
        
        onRealAddressUpdate?.(realAddressData)
      }

    } catch (e) {
      console.error('❌ GOOGLE - Error al obtener detalles:', e);
    } finally {
      setIsSelectingAddress(false);
    }
  }

  const geocodeAddressWithGoogle = async (address) => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error('Google API Key no configurada')
      }

      const requestBody = {
        textQuery: `${address}, Puerto Rico`,
        maxResultCount: 1,
        regionCode: 'PR',
        languageCode: 'es'
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.addressComponents'
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error(`Error en geocoding: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.places && data.places.length > 0) {
        const result = data.places[0]
        const location = result.location
        
        if (location && location.latitude && location.longitude) {
          const coords = { lat: location.latitude, lng: location.longitude }
          
          onLocationSelect(coords)
          await reverseGeocodeWithGoogle(coords)
          
          return coords
        }
      }
      
      throw new Error('No se encontraron resultados en geocoding')
    } catch (error) {
      console.error('❌ GOOGLE - Error en geocoding:', error)
      throw error
    }
  }

  const reverseGeocodeWithGoogle = async (location) => {
    try {
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps JavaScript API no está cargada')
      }
      
      const geocoder = new window.google.maps.Geocoder()
      
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { 
            location: { lat: location.lat, lng: location.lng },
            language: 'es',
            region: 'PR'
          },
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results[0])
            } else {
              reject(new Error(`Geocoder error: ${status}`))
            }
          }
        )
      })

      let municipio = '', barrio = '', route = '', streetNumber = ''
      for (let component of result.address_components || []) {
        const types = component.types || []
        if (types.includes('locality') || types.includes('administrative_area_level_2')) {
          municipio = component.long_name || component.short_name || ''
        }
        if (types.includes('sublocality') || types.includes('neighborhood')) {
          barrio = component.long_name || component.short_name || ''
        }
        if (types.includes('route')) {
          route = component.long_name || component.short_name || ''
        }
        if (types.includes('street_number')) {
          streetNumber = component.long_name || component.short_name || ''
        }
      }
      
      const direccionLinea1 = streetNumber && route 
        ? `${route} ${streetNumber}` 
        : route || result.formatted_address?.split(',')[0] || ''
      
      const currentData = watchedFields
      if (!currentData.linea1 && direccionLinea1) {
        setValue('linea1', direccionLinea1)
      }
      if (!currentData.municipio && municipio) {
        setValue('municipio', municipio)
      }
      if (!currentData.barrio && barrio) {
        setValue('barrio', barrio)
      }
      
      const realAddressData = {
        coordenadas: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        direccion_completa: result.formatted_address || 'Dirección no disponible',
        municipio: municipio,
        barrio: barrio,
        componentes: result.address_components,
        source: 'maps_js_geocoder'
      }
      
      onRealAddressUpdate?.(realAddressData)
      
    } catch (error) {
      console.error('❌ GOOGLE - Error en reverse geocoding:', error)
      
      const errorFallbackData = {
        coordenadas: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        direccion_completa: `Coordenadas: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (Error en reverse geocoding)`,
        municipio: '',
        barrio: '',
        componentes: [],
        source: 'error_fallback',
        error: error.message
      }
      
      onRealAddressUpdate?.(errorFallbackData)
    }
  }

  const validateCoordinates = (coordString) => {
    const cleaned = coordString.trim().replace(/\s+/g, ' ')
    
    const patterns = [
      /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/,
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/,
      /^(-?\d+\.?\d*),(-?\d+\.?\d*)$/
    ]
    
    for (let pattern of patterns) {
      const match = cleaned.match(pattern)
      if (match) {
        const lat = parseFloat(match[1])
        const lng = parseFloat(match[2])
        
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
      
      onLocationSelect(location)
      await reverseGeocodeWithGoogle(location)
      
      const detailedCoordinatesData = {
        coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        precision: { level: 'Manual', description: 'Coordenadas ingresadas manualmente' },
        lat: lat,
        lng: lng
      }
      setCoordinatesData(detailedCoordinatesData)
      onCoordinatesDataUpdate?.(detailedCoordinatesData)
      
      const currentFormData = {
        linea1: watchedFields.linea1 || '',
        linea2: watchedFields.linea2 || '',
        municipio: watchedFields.municipio || '',
        barrio: watchedFields.barrio || '',
        descripcion: watchedFields.descripcion || ''
      }
      
      setAddressData(currentFormData)
      
    } catch (error) {
      console.error('❌ GOOGLE - Error validando coordenadas:', error)
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

  const onSubmit = async (data) => {
    try {
      setAddressData(data)
      setSearchStatus({ 
        type: 'success', 
        message: `✅ Formulario enviado | ${formatAddressForDisplay(data)}` 
      })
      
      if (!hasSelectedSuggestion && !manualCoordinates) {
        const fullAddressParts = []
        if (data.linea1) fullAddressParts.push(data.linea1)
        if (data.linea2) fullAddressParts.push(data.linea2)
        if (data.barrio) fullAddressParts.push(data.barrio)
        if (data.municipio) fullAddressParts.push(data.municipio + ', PR')

        const fullAddress = fullAddressParts.join(', ')
        const processedAddress = preprocessPuertoRicanAddress(fullAddress)

        try {
          await geocodeAddressWithGoogle(processedAddress)
        } catch {
          console.log('❌ GOOGLE - No se pudo geocodificar la dirección del formulario')
        }
      }
      
    } catch (error) {
      console.error('❌ Google - Error en envío:', error)
    }
  }

  return (
    <div className="address-form">
      <h2>Información de Dirección</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <div className="form-group">
          <label htmlFor="busqueda">Buscar Ubicación</label>
          <small style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block' }}>
            Busca direcciones urbanas, rurales (KM), barrios, sectores, negocios, puntos de referencia con Google Places API (New)
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
                <span>Buscando direcciones con Google Places API (New)...</span>
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
              {municipios.map(municipio => (
                <option key={municipio} value={municipio}>{municipio}</option>
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
              Si seleccionas una ubicación de la búsqueda, intentaremos llenar este campo automáticamente
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

export default GoogleAddressForm
