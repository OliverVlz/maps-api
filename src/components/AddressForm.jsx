import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'

// Lista de municipios como fallback
function AddressForm({ addressData, setAddressData, onLocationSelect }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: addressData
  })
  const [autocompleteService, setAutocompleteService] = useState(null)
  const [placesService, setPlacesService] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSelectingAddress, setIsSelectingAddress] = useState(false)
  const [searchStatus, setSearchStatus] = useState(null)
  const [submittedData, setSubmittedData] = useState(null)
  const [realAddressFromCoords, setRealAddressFromCoords] = useState(null)
  const [manualCoordinates, setManualCoordinates] = useState('')
  const [coordinatesData, setCoordinatesData] = useState(null)
  const [coordinatesError, setCoordinatesError] = useState('')
  const [isValidatingCoords, setIsValidatingCoords] = useState(false)
  const [hasSelectedSuggestion, setHasSelectedSuggestion] = useState(false)
  const [directGeocodingWarning, setDirectGeocodingWarning] = useState(null)
  
  // Estados para municipios dinámicos
  const [municipios, setMunicipios] = useState([])
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false)
  const [municipiosSource, setMunicipiosSource] = useState(null)
  
  const searchInputRef = useRef(null)
  const debounceTimeoutRef = useRef(null)
  const currentQueryRef = useRef('')

  useEffect(() => {
    if (window.google && window.google.maps) {
      const autocomplete = new window.google.maps.places.AutocompleteService()
      const places = new window.google.maps.places.PlacesService(document.createElement('div'))
      setAutocompleteService(autocomplete)
      setPlacesService(places)
    }

    // Cargar municipios desde API
    const loadMunicipios = async () => {
      setIsLoadingMunicipios(true)
      
      try {
        // Opción 1: Intentar con Census Bureau API primero (fuente oficial más actualizada)
        const censusResponse = await fetch('https://api.census.gov/data/2020/dec/pl?get=NAME&for=county:*&in=state:72')
        
        if (censusResponse.ok) {
          const censusData = await censusResponse.json()
          
          if (Array.isArray(censusData) && censusData.length > 1) {
            // Procesar datos del Census Bureau: eliminar header y extraer nombres
            const municipiosFromCensus = censusData
              .slice(1) // Eliminar header row
              .map(row => {
                const fullName = row[0] // "Adjuntas Municipio, Puerto Rico"
                const municipioName = fullName.replace(' Municipio, Puerto Rico', '')
                return municipioName
              })
              .filter(name => name && name.length > 0)
              .sort()
            
            setMunicipios(municipiosFromCensus)
            setMunicipiosSource('census-bureau')
            console.log('✅ Municipios cargados desde Census Bureau (oficial):', municipiosFromCensus.length)
            setIsLoadingMunicipios(false)
            return
          }
        }
        
        throw new Error('Census Bureau API no disponible')
      } catch (error) {
        console.log('⚠️ No se pudo cargar desde Census Bureau:', error.message)
        
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
              console.log('✅ Municipios cargados desde archivo local (fallback):', municipiosFromLocal.length)
              setIsLoadingMunicipios(false)
              return
            }
          }
          
          throw new Error('Archivo local no disponible')
        } catch (error2) {
          console.log('❌ Error: No se pudieron cargar municipios desde ninguna fuente:', error2.message)
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

  const searchAddress = (query) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    if (!autocompleteService || query.length < 3) {
      setSuggestions([])
      setSearchStatus(null)
      setIsSearching(false)
      setHasSelectedSuggestion(false) // Resetear estado de selección
      setDirectGeocodingWarning(null) // Limpiar cualquier advertencia previa
      return
    }

    setIsSearching(true)
    setSearchStatus(null)
    setHasSelectedSuggestion(false) // Resetear cuando se hace nueva búsqueda

    // Detectar si el usuario incluyó barrio manualmente en la búsqueda
    const barrioInQuery = query.match(/\b(?:bo\.?|barrio)\s+([^,]+)/i)
    if (barrioInQuery) {
      console.log('🏘️ Barrio detectado en búsqueda:', barrioInQuery[1].trim())
    }

    // Guardar la query original para usar en selectAddress
    currentQueryRef.current = query

    debounceTimeoutRef.current = setTimeout(() => {
      const allPredictions = []
      let completedRequests = 0
      const totalRequests = 3

      const handleResponse = (predictions, status) => {
        completedRequests++
        
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          allPredictions.push(...predictions)
        }

        if (completedRequests === totalRequests) {
          setIsSearching(false)
          
          if (allPredictions.length > 0) {
            const uniquePredictions = allPredictions.filter((prediction, index, self) => 
              index === self.findIndex(p => p.place_id === prediction.place_id)
            )
            setSuggestions(uniquePredictions.slice(0, 10))
        setShowSuggestions(true)
            setSearchStatus({ 
              type: 'success', 
              message: `${uniquePredictions.length} ubicaciones encontradas. Selecciona una para obtener la ubicación exacta.` 
            })
      } else {
        setSuggestions([])
        setShowSuggestions(false)
            setSearchStatus({ 
              type: 'warning', 
              message: 'No se encontraron sugerencias automáticas. Puedes llenar el formulario manualmente y se intentará ubicar la dirección.' 
            })
          }
        }
      }

      const geocodeRequest = {
        input: preprocessPuertoRicanAddress(query),
        componentRestrictions: { country: 'pr' },
        types: ['geocode']
      }

      const establishmentRequest = {
        input: preprocessPuertoRicanAddress(query),
        componentRestrictions: { country: 'pr' },
        types: ['establishment']
      }

      const regionRequest = {
        input: query,
        componentRestrictions: { country: 'pr' },
        types: ['(regions)']
      }

      // Búsqueda mejorada para direcciones rurales con variaciones de términos
      const ruralVariations = []
      if (/\bKM\b|\bkilómetro\b|\bCarr\b|\bCarretera\b|\bPR-?\d|\bRuta\b/i.test(query)) {
        console.log('🛣️ Búsqueda rural detectada, ampliando términos...')
        
        // Expandir abreviaciones comunes
        let expandedQuery = query
          .replace(/\bCarr\.?\s*(\d+)/gi, 'Carretera $1')
          .replace(/\bPR-?(\d+)/gi, 'PR-$1 Carretera $1')
          .replace(/\bKM\s*([\d.]+)/gi, 'kilómetro $1')
        
        if (expandedQuery !== query) {
          ruralVariations.push({
            input: expandedQuery,
            componentRestrictions: { country: 'pr' },
            types: ['geocode']
          })
        }
      }

      autocompleteService.getPlacePredictions(geocodeRequest, handleResponse)
      autocompleteService.getPlacePredictions(establishmentRequest, handleResponse)
      autocompleteService.getPlacePredictions(regionRequest, handleResponse)

      // Realizar búsquedas adicionales para variaciones rurales
      ruralVariations.forEach(ruralRequest => {
        autocompleteService.getPlacePredictions(ruralRequest, (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            allPredictions.push(...predictions)
          }
        })
      })
    }, 300)
  }

  const selectAddress = (placeId, originalQuery = '') => {
    if (!placesService) return

    setIsSelectingAddress(true)
    setSearchStatus(null)
    setSuggestions([])
    setShowSuggestions(false)

    // Extraer barrio de la búsqueda original si existe
    const barrioPatterns = [
      /\b(?:bo\.?|barrio)\s+([^,]+)/i,    // "bo. naranjo" o "barrio pueblo"
      /,\s*([^,]+?)(?:\s*,|$)/g           // Último elemento después de coma
    ]
    
    let manualBarrio = null
    
    // Intentar primer patrón (bo./barrio explícito)
    const explicitBarrio = originalQuery.match(barrioPatterns[0])
    if (explicitBarrio) {
      manualBarrio = explicitBarrio[1].trim()
      console.log('🏘️ Barrio explícito detectado:', manualBarrio)
    } else {
      // Si no hay patrón explícito, intentar extraer de la estructura de la búsqueda
      // Ejemplo: "32 pr-156, comerio, bo. naranjo" - tomar "bo. naranjo"
      const parts = originalQuery.split(',').map(p => p.trim())
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1]
        // Verificar si la última parte parece un barrio
        if (lastPart.match(/\b(?:bo\.?|pueblo|centro|urb\.?|sector)\b/i) || 
            (!lastPart.match(/\d/) && lastPart.length > 2)) {
          manualBarrio = lastPart
          console.log('🏘️ Barrio inferido de estructura:', manualBarrio)
        }
      }
    }
    
    console.log('🔍 Query original:', originalQuery, '| Barrio detectado:', manualBarrio)

    const request = {
      placeId: placeId,
      fields: [
        'geometry', 
        'formatted_address', 
        'address_components',
        'name',
        'place_id',
        'types',
        'vicinity',
        'adr_address'
      ]
    }

    placesService.getDetails(request, (place, status) => {
      setIsSelectingAddress(false)
      
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }

        onLocationSelect(location)

        // Realizar geocodificación inversa para obtener la dirección REAL de las coordenadas
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ 
          location: location,
          componentRestrictions: { country: 'pr' }
        }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const realResult = results[0]
            const realComponents = realResult.address_components
            
            // Extraer datos reales de la coordenada
            const realMunicipio = realComponents.find(component => 
              component.types.includes('administrative_area_level_2')
            )?.long_name || ''
            
            const realBarrio = realComponents.find(component => 
              component.types.includes('sublocality_level_1') || 
              component.types.includes('neighborhood') ||
              component.types.includes('sublocality') ||
              component.types.includes('locality')
            )?.long_name || ''

            const realAddressData = {
              coordenadas: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
              direccion_completa: realResult.formatted_address,
              municipio: realMunicipio,
              barrio: realBarrio,
              componentes: realComponents.map(c => ({
                nombre: c.long_name,
                tipos: c.types
              }))
            }
            
            setRealAddressFromCoords(realAddressData)
            
            console.log('🌍 DIRECCIÓN REAL de las coordenadas:', realAddressData)
            console.log('📊 COMPARACIÓN - Real vs Usuario:', {
              coordenadas: realAddressData.coordenadas,
              municipio_real: realMunicipio,
              municipio_usuario: municipio,
              barrio_real: realBarrio,
              barrio_usuario: barrio || manualBarrio,
              coincide_municipio: realMunicipio.toLowerCase() === municipio.toLowerCase(),
              coincide_barrio: realBarrio.toLowerCase() === (barrio || manualBarrio || '').toLowerCase()
            })
          }
        })

        const addressComponents = place.address_components || []
        
        console.log('🗺️ Lugar seleccionado:', {
          nombre: place.name,
          direccion_formateada: place.formatted_address,
          tipos: place.types,
          vicinity: place.vicinity
        })
        
        console.log('🗺️ Componentes de dirección encontrados:', addressComponents.map(c => ({
          nombre: c.long_name,
          tipos: c.types
        })))
        
        const municipio = addressComponents.find(component => 
          component.types.includes('administrative_area_level_2')
        )?.long_name || ''

        let barrio = addressComponents.find(component => 
          component.types.includes('sublocality_level_1') || 
          component.types.includes('neighborhood') ||
          component.types.includes('sublocality') ||
          component.types.includes('locality')
        )?.long_name || ''

        // Si no encontramos barrio en los componentes pero es un establishment o lugar específico
        if (!barrio && place.name && place.types && 
            (place.types.includes('establishment') || place.types.includes('point_of_interest'))) {
          // Usar el vicinity o extraer de la dirección formateada
          if (place.vicinity) {
            const vicinityParts = place.vicinity.split(',')
            if (vicinityParts.length > 1) {
              barrio = vicinityParts[vicinityParts.length - 2].trim()
            }
          }
        }

        // Si aún no hay barrio, usar el que detectamos en la búsqueda manual
        if (!barrio && manualBarrio) {
          barrio = manualBarrio
          console.log('🏘️ Usando barrio manual:', barrio)
        }

        console.log('📍 Datos extraídos - Municipio:', municipio, '| Barrio:', barrio)

        const currentFormData = watch()

        // Mejorar la dirección línea 1
        let direccionLinea1 = place.formatted_address.split(',')[0]
        
        // Detectar y mejorar direcciones rurales con kilómetros
        const fullAddress = place.formatted_address
        
        // Buscar patrones de carreteras rurales en la dirección completa
        const ruralPatterns = [
          /\bKM\s*[\d.]+/i,
          /\bkilómetro\s*[\d.]+/i,
          /\bCarr\.?\s*\d+/i,
          /\bCarretera\s*\d+/i,
          /\bPR-?\s*\d+/i,
          /\bRuta\s*\d+/i
        ]
        
        const hasRuralPattern = ruralPatterns.some(pattern => pattern.test(fullAddress))
        
        if (hasRuralPattern) {
          // Para direcciones rurales, usar más contexto de la dirección formateada
          const addressParts = fullAddress.split(',')
          if (addressParts.length >= 2) {
            direccionLinea1 = `${addressParts[0].trim()}, ${addressParts[1].trim()}`
          }
          console.log('🛣️ Dirección rural detectada con KM/Carretera')
        }
        
        // Si es un establishment/lugar específico, incluir el nombre
        if (place.name && place.types && 
            (place.types.includes('establishment') || place.types.includes('point_of_interest'))) {
          // Solo agregar el nombre si no está ya incluido en la dirección
          if (!direccionLinea1.toLowerCase().includes(place.name.toLowerCase())) {
            direccionLinea1 = `${place.name}, ${direccionLinea1}`
          }
        }

        setValue('linea1', direccionLinea1)
        if (municipio && municipios.includes(municipio)) {
          setValue('municipio', municipio)
        }
        if (barrio) {
          setValue('barrio', barrio)
        }

        const updatedData = {
          linea1: direccionLinea1,
          municipio: municipio && municipios.includes(municipio) ? municipio : currentFormData.municipio || '',
          linea2: currentFormData.linea2 || '',
          barrio: barrio || currentFormData.barrio || '',
          descripcion: currentFormData.descripcion || ''
        }

        console.log('📋 Datos finales a guardar:', {
          direccionLinea1,
          municipio,
          barrio,
          barrioFuente: barrio ? 
            (manualBarrio && barrio === manualBarrio ? 'manual' : 'google maps') : 
            'no encontrado',
          updatedData
        })
        setAddressData(updatedData)
        
        let statusMessage = `✅ Dirección seleccionada | ${formatAddressForDisplay(updatedData)}`
        if (hasRuralPattern) {
          statusMessage = `🛣️ Dirección rural seleccionada | ${formatAddressForDisplay(updatedData)}`
        }
        
        setSearchStatus({ type: 'success', message: statusMessage })
        setHasSelectedSuggestion(true)
      } else {
        setSearchStatus({ type: 'error', message: 'Error al obtener detalles de la dirección' })
      }
    })
  }

  const formatUserAddress = () => {
    const parts = []
    if (addressData.linea1) parts.push(addressData.linea1)
    if (addressData.linea2) parts.push(addressData.linea2)
    if (addressData.barrio) parts.push(addressData.barrio)
    if (addressData.municipio) parts.push(`${addressData.municipio}, PR`)
    return parts.join(', ')
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
      error: 'Formato inválido. Usa: "18.219107, -66.225394" o "18.219107 -66.225394"' 
    }
  }

  const handleCoordinatesInput = (value) => {
    setManualCoordinates(value)
    setCoordinatesError('')
    setCoordinatesData(null)
    
    if (value.length < 5) return
    
    const validation = validateCoordinates(value)
    
    if (!validation.valid) {
      setCoordinatesError(validation.error)
      return
    }
    
    // Si es válido, hacer geocodificación inversa
    if (window.google && window.google.maps) {
      setIsValidatingCoords(true)
      setCoordinatesError('')
      
      const geocoder = new window.google.maps.Geocoder()
      const location = { lat: validation.lat, lng: validation.lng }
      
      geocoder.geocode({ 
        location,
        componentRestrictions: { country: 'pr' }
      }, (results, status) => {
        setIsValidatingCoords(false)
        
        if (status === 'OK' && results[0]) {
          const result = results[0]
          const components = result.address_components
          
          // Extraer información detallada
          const municipio = components.find(c => 
            c.types.includes('administrative_area_level_2')
          )?.long_name || ''
          
          const barrio = components.find(c => 
            c.types.includes('sublocality_level_1') || 
            c.types.includes('neighborhood') ||
            c.types.includes('sublocality') ||
            c.types.includes('locality')
          )?.long_name || ''
          
          const route = components.find(c => 
            c.types.includes('route')
          )?.long_name || ''
          
          const streetNumber = components.find(c => 
            c.types.includes('street_number')
          )?.long_name || ''
          
          const detailedData = {
            coordinates: `${validation.lat.toFixed(6)}, ${validation.lng.toFixed(6)}`,
            formatted_address: result.formatted_address,
            municipio,
            barrio,
            route,
            street_number: streetNumber,
            place_id: result.place_id,
            location_type: result.geometry.location_type,
            components: components.map(c => ({
              name: c.long_name,
              short_name: c.short_name,
              types: c.types
            })),
            precision: getPrecisionLevel(result.geometry.location_type),
            lat: validation.lat,
            lng: validation.lng
          }
          
          setCoordinatesData(detailedData)
          
          // Actualizar el mapa con las nuevas coordenadas
          onLocationSelect({ lat: validation.lat, lng: validation.lng })
          
          console.log('📍 Datos de coordenadas manuales:', detailedData)
        } else {
          setCoordinatesError('No se pudo obtener información de estas coordenadas')
        }
      })
    }
  }

  const getPrecisionLevel = (locationType) => {
    switch (locationType) {
      case 'ROOFTOP': return { level: 'Muy Alta', description: 'Ubicación exacta del edificio' }
      case 'RANGE_INTERPOLATED': return { level: 'Alta', description: 'Interpolación entre direcciones conocidas' }
      case 'GEOMETRIC_CENTER': return { level: 'Media', description: 'Centro geométrico del área' }
      case 'APPROXIMATE': return { level: 'Baja', description: 'Ubicación aproximada' }
      default: return { level: 'Desconocida', description: 'Nivel de precisión no determinado' }
    }
  }

  const findNearbyLocations = (data) => {
    if (!window.google || !window.google.maps) return

    const geocoder = new window.google.maps.Geocoder()
    
    // Intentar búsquedas progresivamente más amplias
    const searchQueries = [
      // Búsqueda específica con toda la información
      `${data.linea1}, ${data.barrio}, ${data.municipio}, PR`,
      // Sin línea específica, solo barrio y municipio
      `${data.barrio}, ${data.municipio}, PR`,
      // Solo municipio
      `${data.municipio}, Puerto Rico`,
      // Municipio y términos relacionados
      `centro ${data.municipio}, Puerto Rico`,
      `pueblo ${data.municipio}, Puerto Rico`
    ].filter(query => query.trim() !== ', PR') // Filtrar queries vacías

    console.log('🔍 Buscando ubicaciones cercanas con queries:', searchQueries)

    const performSearch = (queryIndex = 0) => {
      if (queryIndex >= searchQueries.length) {
        // No se encontró nada, mostrar sugerencias generales
        setDirectGeocodingWarning({
          type: 'no_results',
          message: 'No se pudo encontrar la ubicación específica',
          suggestions: [
            `Verifica la ortografía del municipio: "${data.municipio}"`,
            `Intenta buscar solo el centro del municipio`,
            `Usa puntos de referencia conocidos (escuelas, plazas, iglesias)`,
            `Para direcciones rurales, incluye la carretera: "Carr 123" o "PR-456"`,
            `Si conoces las coordenadas exactas, úsalas directamente`
          ]
        })
        return
      }

      const currentQuery = searchQueries[queryIndex]
      console.log(`🔍 Intentando búsqueda ${queryIndex + 1}/${searchQueries.length}: "${currentQuery}"`)

      geocoder.geocode({ 
        address: currentQuery,
        componentRestrictions: { country: 'pr' }
      }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          // Encontramos resultados
          const nearbyLocations = results.slice(0, 3).map(result => ({
            address: result.formatted_address,
            location: {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            },
            placeId: result.place_id,
            components: result.address_components
          }))

          setDirectGeocodingWarning({
            type: 'nearby_suggestions',
            message: queryIndex === 0 ? 
              'Se encontraron ubicaciones similares. ¿Es alguna de estas?' :
              `No se encontró la dirección exacta, pero hay ubicaciones en ${data.municipio}:`,
            nearbyLocations,
            originalQuery: currentQuery,
            searchLevel: queryIndex + 1
          })

          console.log('✅ Ubicaciones cercanas encontradas:', nearbyLocations)
        } else {
          // Esta búsqueda falló, intentar la siguiente
          performSearch(queryIndex + 1)
        }
      })
    }

    performSearch()
  }

  const selectNearbyLocation = (location, address) => {
    onLocationSelect(location)
    setDirectGeocodingWarning(null)
    setSearchStatus({ 
      type: 'success', 
      message: `✅ Ubicación seleccionada | ${formatAddressForDisplay(addressData)}` 
    })
    console.log('📍 Usuario seleccionó ubicación cercana:', { location, address })
  }

  const onSubmit = (data) => {
    setAddressData(data)
    setSubmittedData({
      ...data,
      timestamp: new Date().toLocaleString()
    })
    setSearchStatus({ 
      type: 'success', 
      message: `✅ Formulario enviado | ${formatAddressForDisplay(data)}` 
    })
    console.log('Datos del formulario:', data)

    // Si no se ha seleccionado una sugerencia ni se han ingresado coordenadas manuales,
    // intentar geocodificación directa de la dirección del formulario
    if (!hasSelectedSuggestion && !manualCoordinates && window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder()

      // Construir la dirección completa del formulario
      const fullAddressParts = []
      if (data.linea1) fullAddressParts.push(data.linea1)
      if (data.linea2) fullAddressParts.push(data.linea2)
      if (data.barrio) fullAddressParts.push(data.barrio)
      if (data.municipio) fullAddressParts.push(data.municipio + ', PR')

      const fullAddress = fullAddressParts.join(', ')
      const processedAddress = preprocessPuertoRicanAddress(fullAddress)

      console.log('🔍 Intentando geocodificación directa de:', fullAddress)
      console.log('🔄 Dirección procesada para Google Maps:', processedAddress)

      geocoder.geocode({ 
        address: processedAddress,
        componentRestrictions: { country: 'pr' }
      }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          const addressResult = results[0]

          // Verificar si la dirección encontrada coincide con lo que el usuario ingresó
          const realMunicipio = addressResult.address_components.find(c =>
            c.types.includes('administrative_area_level_2')
          )?.long_name || ''

          const realBarrio = addressResult.address_components.find(c =>
            c.types.includes('sublocality_level_1') ||
            c.types.includes('neighborhood') ||
            c.types.includes('sublocality') ||
            c.types.includes('locality')
          )?.long_name || ''

          const municipioMatches = realMunicipio.toLowerCase() === (data.municipio || '').toLowerCase()
          const barrioMatches = realBarrio.toLowerCase() === (data.barrio || '').toLowerCase() ||
                               realBarrio.includes(data.barrio || '') ||
                               (data.barrio || '').includes(realBarrio)

          // Detectar si es una dirección rural que Google Maps interpretó incorrectamente
          const isRuralAddress = /\b(?:carr|carretera|km|kilómetro|pr-\d+)/i.test(fullAddress)
          const foundAddressSeemsDifferent = !addressResult.formatted_address.toLowerCase().includes('km') && 
                                           !addressResult.formatted_address.toLowerCase().includes('carretera') &&
                                           isRuralAddress

          if (!municipioMatches || !barrioMatches || foundAddressSeemsDifferent) {
            const warningMessages = []
            if (!municipioMatches) {
              warningMessages.push(`Municipio: Google Maps encontró "${realMunicipio}" pero escribiste "${data.municipio}"`)
            }
            if (!barrioMatches && data.barrio) {
              warningMessages.push(`Barrio: Google Maps encontró "${realBarrio}" pero escribiste "${data.barrio}"`)
            }
            if (foundAddressSeemsDifferent) {
              warningMessages.push(`⚠️ Dirección rural: Google Maps encontró "${addressResult.formatted_address}" pero escribiste una dirección con KM/Carretera. Esto puede indicar que Google Maps no interpretó correctamente la ubicación exacta en la carretera.`)
            }

            setDirectGeocodingWarning({
              type: 'discrepancy',
              messages: warningMessages,
              foundLocation: {
                lat: location.lat(),
                lng: location.lng()
              },
              foundAddress: addressResult.formatted_address
            })

            console.log('⚠️ Discrepancias encontradas en geocodificación directa:', warningMessages)
          } else {
            // La dirección coincide, actualizar el mapa
            onLocationSelect({ lat: location.lat(), lng: location.lng() })
            setDirectGeocodingWarning(null)
            console.log('✅ Geocodificación directa exitosa, ubicación actualizada')
          }
        } else {
          // No se encontró la dirección exacta, buscar ubicaciones cercanas
          console.log('❌ No se pudo geocodificar la dirección del formulario, buscando alternativas...')
          findNearbyLocations(data)
        }
      })
    }
  }

  return (
    <div className="address-form">
      <h2>Información de Dirección</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <div className="form-group">
          <label htmlFor="busqueda">Buscar Ubicación</label>
          <small style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block' }}>
            🔍 Busca direcciones urbanas, rurales (KM), barrios, sectores, negocios, puntos de referencia
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
                <span>🔍 Buscando direcciones...</span>
              </div>
            )}
            {isSelectingAddress && (
              <div className="search-loading">
                <span>📍 Obteniendo detalles de la dirección...</span>
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
                    onClick={() => selectAddress(suggestion.place_id, currentQueryRef.current)}
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
          <label htmlFor="coordinates">🌍 Ingresar Coordenadas Directamente</label>
          <small style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'block' }}>
            📍 Formato: "18.219107, -66.225394" - Se validará automáticamente para Puerto Rico
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
                <span>📡 Validando coordenadas...</span>
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

        <button type="submit" className="submit-btn">
          Confirmar Dirección
        </button>
      </form>

      {submittedData && (
        <details className="form-result">
          <summary><h3>✅ Datos Enviados</h3></summary>
          <div className="result-grid">
            <div className="result-item">
              <label>Dirección Línea 1:</label>
              <span>{submittedData.linea1 || 'No especificado'}</span>
            </div>
            <div className="result-item">
              <label>Dirección Línea 2:</label>
              <span>{submittedData.linea2 || 'No especificado'}</span>
            </div>
            <div className="result-item">
              <label>Municipio:</label>
              <span>{submittedData.municipio || 'No especificado'}</span>
            </div>
            <div className="result-item">
              <label>Barrio/Sector:</label>
              <span>{submittedData.barrio || 'No especificado'}</span>
            </div>
            <div className="result-item">
              <label>Descripción:</label>
              <span>{submittedData.descripcion || 'No especificado'}</span>
            </div>
            <div className="result-item">
              <label>Enviado el:</label>
              <span>{submittedData.timestamp}</span>
            </div>
          </div>
        </details>
      )}

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

      {coordinatesData && (
        <div className="coordinates-details">
          <h4>📍 Información Detallada de Coordenadas</h4>
          <div className="coordinates-content">
            
            <div className="coordinates-basic">
              <h5>📌 Información Básica</h5>
              <div className="coordinates-grid">
                <div className="coord-item">
                  <label>Coordenadas:</label>
                  <span className="coord-value">{coordinatesData.coordinates}</span>
                </div>
                <div className="coord-item">
                  <label>Precisión:</label>
                  <span className={`precision-level ${coordinatesData.precision.level.toLowerCase().replace(' ', '-')}`}>
                    {coordinatesData.precision.level}
                  </span>
                </div>
                <div className="coord-item">
                  <label>Descripción:</label>
                  <span>{coordinatesData.precision.description}</span>
                </div>
                <div className="coord-item">
                  <label>Place ID:</label>
                  <span className="place-id">{coordinatesData.place_id}</span>
                </div>
              </div>
            </div>

            <div className="coordinates-address">
              <h5>🏠 Dirección Encontrada</h5>
              <div className="address-found">
                <p className="main-address">{coordinatesData.formatted_address}</p>
                <div className="address-breakdown">
                  {coordinatesData.street_number && (
                    <div className="addr-component">
                      <strong>Número:</strong> {coordinatesData.street_number}
                    </div>
                  )}
                  {coordinatesData.route && (
                    <div className="addr-component">
                      <strong>Calle/Carretera:</strong> {coordinatesData.route}
                    </div>
                  )}
                  {coordinatesData.barrio && (
                    <div className="addr-component">
                      <strong>Barrio:</strong> {coordinatesData.barrio}
                    </div>
                  )}
                  {coordinatesData.municipio && (
                    <div className="addr-component">
                      <strong>Municipio:</strong> {coordinatesData.municipio}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="coordinates-technical">
              <h5>🔧 Información Técnica</h5>
              <div className="technical-grid">
                <div className="tech-item">
                  <label>Latitud:</label>
                  <span>{coordinatesData.lat.toFixed(8)}°</span>
                </div>
                <div className="tech-item">
                  <label>Longitud:</label>
                  <span>{coordinatesData.lng.toFixed(8)}°</span>
                </div>
                <div className="tech-item">
                  <label>Tipo de Ubicación:</label>
                  <span>{coordinatesData.location_type}</span>
                </div>
                <div className="tech-item">
                  <label>Componentes:</label>
                  <span>{coordinatesData.components.length} elementos detectados</span>
                </div>
              </div>
            </div>

            <details className="coordinates-components">
              <summary>🔍 Ver Todos los Componentes Detectados</summary>
              <div className="components-list">
                {coordinatesData.components.map((component, index) => (
                  <div key={index} className="component-item">
                    <div className="component-name">{component.name}</div>
                    <div className="component-short">({component.short_name})</div>
                    <div className="component-types">
                      {component.types.map((type, i) => (
                        <span key={i} className="component-type">{type}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>

          </div>
        </div>
      )}

      {directGeocodingWarning && (
        <div className={`geocoding-warning ${directGeocodingWarning.type}`}>
          {directGeocodingWarning.type === 'discrepancy' && (
            <>
              <h4>⚠️ Discrepancias Detectadas</h4>
              <div className="warning-content">
                <p>La ubicación encontrada no coincide exactamente con los datos ingresados:</p>
                <ul>
                  {directGeocodingWarning.messages.map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
                <div className="warning-actions">
                  <button 
                    type="button"
                    onClick={() => {
                      onLocationSelect(directGeocodingWarning.foundLocation)
                      setDirectGeocodingWarning(null)
                      setSearchStatus({ 
                        type: 'success', 
                        message: `✅ Ubicación aceptada | ${formatAddressForDisplay(addressData)}` 
                      })
                    }}
                    className="accept-btn"
                  >
                    ✅ Usar esta ubicación de todas formas
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDirectGeocodingWarning(null)}
                    className="dismiss-btn"
                  >
                    ❌ Revisar mi dirección
                  </button>
                </div>
                <div className="found-address">
                  <strong>Dirección encontrada:</strong> {directGeocodingWarning.foundAddress}
                </div>
              </div>
            </>
          )}

          {directGeocodingWarning.type === 'nearby_suggestions' && (
            <>
              <h4>📍 Ubicaciones Sugeridas</h4>
              <div className="warning-content">
                <p>{directGeocodingWarning.message}</p>
                <div className="nearby-locations">
                  {directGeocodingWarning.nearbyLocations.map((location, index) => (
                    <div key={index} className="nearby-location-item">
                      <div className="location-address">{location.address}</div>
                      <button
                        type="button"
                        onClick={() => selectNearbyLocation(location.location, location.address)}
                        className="select-location-btn"
                      >
                        📍 Usar esta ubicación
                      </button>
                    </div>
                  ))}
                </div>
                <div className="search-tips">
                  <h5>💡 Tips para mejorar tu búsqueda:</h5>
                  <ul>
                    <li>Usa el <strong>buscador automático</strong> en la parte superior para seleccionar sugerencias</li>
                    <li>Intenta con <strong>puntos de referencia</strong> conocidos (escuelas, plazas, iglesias)</li>
                    <li>Para direcciones rurales, incluye la <strong>carretera</strong>: "Carr 123" o "PR-456"</li>
                    <li>Busca <strong>negocios cercanos</strong> a tu dirección</li>
                  </ul>
                </div>
                <div className="warning-actions">
                  <button 
                    type="button"
                    onClick={() => setDirectGeocodingWarning(null)}
                    className="dismiss-btn"
                  >
                    ❌ Cerrar y revisar mi dirección
                  </button>
                </div>
              </div>
            </>
          )}

          {directGeocodingWarning.type === 'no_results' && (
            <>
              <h4>🔍 No se encontró la ubicación</h4>
              <div className="warning-content">
                <p>{directGeocodingWarning.message}</p>
                <div className="search-suggestions">
                  <h5>🎯 Sugerencias para encontrar tu ubicación:</h5>
                  <ul>
                    {directGeocodingWarning.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
                <div className="alternative-methods">
                  <h5>🔧 Métodos alternativos:</h5>
                  <ul>
                    <li><strong>Usa el buscador automático</strong> arriba para encontrar sugerencias de Google</li>
                    <li><strong>Ingresa coordenadas directas</strong> si las tienes disponibles</li>
                    <li><strong>Busca un lugar cercano conocido</strong> y selecciónalo primero</li>
                  </ul>
                </div>
                <div className="warning-actions">
                  <button 
                    type="button"
                    onClick={() => {
                      setDirectGeocodingWarning(null)
                      if (searchInputRef.current) {
                        searchInputRef.current.focus()
                      }
                    }}
                    className="try-search-btn"
                  >
                    🔍 Intentar con el buscador automático
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDirectGeocodingWarning(null)}
                    className="dismiss-btn"
                  >
                    ❌ Cerrar
                  </button>
                </div>
              </div>
            </>
          )}

          {directGeocodingWarning.type === 'not_found' && (
            <>
              <h4>❌ Ubicación no encontrada</h4>
              <div className="warning-content">
                <p>{directGeocodingWarning.message}</p>
                <div className="alternative-actions">
                  <h5>🔄 ¿Qué puedes hacer?</h5>
                  <ul>
                    <li>Usa el <strong>buscador automático</strong> para ver sugerencias de Google Maps</li>
                    <li>Verifica la <strong>ortografía</strong> del municipio y barrio</li>
                    <li>Intenta buscar solo el <strong>centro del municipio</strong> primero</li>
                    <li>Usa <strong>coordenadas exactas</strong> si las tienes</li>
                  </ul>
                </div>
                <div className="warning-actions">
                  <button 
                    type="button"
                    onClick={() => {
                      setDirectGeocodingWarning(null)
                      if (searchInputRef.current) {
                        searchInputRef.current.focus()
                      }
                    }}
                    className="try-search-btn"
                  >
                    🔍 Usar buscador automático
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDirectGeocodingWarning(null)}
                    className="dismiss-btn"
                  >
                    ❌ Cerrar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <details className="address-help">
        <summary><h4>📋 ¿Cómo obtener una dirección completa en Puerto Rico?</h4></summary>
        <div className="help-content">
          <div className="help-section">
            <h5>✅ Información Necesaria:</h5>
            <ul>
              <li><strong>Línea 1:</strong> Dirección principal
                <ul style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                  <li>📍 <strong>Urbana:</strong> 123 Calle Principal</li>
                  <li>🛣️ <strong>Rural:</strong> KM 15.2 Carr. 123, PR-456 KM 8.5</li>
                </ul>
              </li>
              <li><strong>Línea 2:</strong> Apartamento, suite, etc. (opcional)</li>
              <li><strong>Municipio:</strong> Uno de los 78 municipios de PR</li>
              <li><strong>Barrio/Sector:</strong> Subdivisión del municipio</li>
              <li><strong>Código Postal:</strong> 00xxx (se agrega automáticamente por correo)</li>
            </ul>
          </div>
          
          <div className="help-section">
            <h5>🔍 Tips de Búsqueda:</h5>
            <ul>
              <li><strong>Zonas Urbanas:</strong> "Calle Principal Bayamón", "Pueblo Cayey"</li>
              <li><strong>Zonas Rurales:</strong> "KM 15 Carr 123", "Carretera 456 Caguas"</li>
              <li>Usa <strong>puntos de referencia</strong> (Ej: "Escuela Central", "Plaza del Mercado")</li>
              <li>Busca <strong>negocios conocidos</strong> cerca de tu dirección</li>
              <li>Si no encuentra tu ubicación exacta, selecciona el <strong>punto más cercano</strong></li>
            </ul>
          </div>

          <div className="help-section">
            <h5>🌍 Coordenadas Directas:</h5>
            <ul>
              <li><strong>Formato aceptado:</strong> "18.219107, -66.225394"</li>
              <li><strong>Con espacios:</strong> "18.219107 -66.225394"</li>
              <li><strong>Sin espacios:</strong> "18.219107,-66.225394"</li>
              <li><strong>Validación automática</strong> para Puerto Rico (Lat: 17.8-18.7, Lng: -67.5 a -65.0)</li>
              <li><strong>Información detallada</strong> con precisión y componentes de dirección</li>
              <li>💡 Usa este método si tienes coordenadas exactas de GPS</li>
            </ul>
          </div>

          <div className="help-section">
            <h5>🛣️ Direcciones Rurales Comunes:</h5>
            <ul>
              <li><strong>KM + Carretera:</strong> "KM 15.2 Carr. 123"</li>
              <li><strong>PR (Carretera Estatal):</strong> "PR-456 KM 8.5"</li>
              <li><strong>Carretera + Municipio:</strong> "Carretera 789 Humacao"</li>
              <li><strong>Ruta + Sector:</strong> "Ruta 321 Bo. Pueblo"</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  )
}

export default AddressForm
