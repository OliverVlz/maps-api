import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AddressAutofill, useConfirmAddress } from '@mapbox/search-js-react'
import { useForm, Controller } from 'react-hook-form'

const MapboxAddressFormClean = ({ 
  addressData, 
  setAddressData, 
  onAddressSelect, 
  onRealAddressUpdate,
  onCoordinatesDataUpdate
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

  // ⭐ Función para estructurar datos de dirección real (compatible con detalles)
  const createRealAddressData = useCallback((feature, lat, lng, source = 'geocoding') => {
    const props = feature.properties || {}
    
    // Extraer dirección principal de manera robusta
    let direccionCompleta = ''
    
    // Para autofill, usar address_line1 que es más confiable
    if (source === 'autofill' && props.address_line1) {
      direccionCompleta = props.address_line1
    }
    // Para geocoding/reverse geocoding
    else if (props.address) {
      direccionCompleta = props.address
    } else if (feature.text) {
      if (props.house_number) {
        direccionCompleta = `${feature.text} ${props.house_number}`
      } else {
        direccionCompleta = feature.text
      }
    } else if (feature.place_name) {
      const parts = feature.place_name.split(',')
      direccionCompleta = parts[0].trim()
    } else {
      direccionCompleta = `Ubicación ${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
    
    // Extraer municipio
    let municipio = ''
    if (feature.context && Array.isArray(feature.context)) {
      const place = feature.context.find(item => 
        item.id && (item.id.includes('place') || item.id.includes('locality'))
      )
      if (place && place.text) {
        municipio = place.text
      }
    }
    
    // Extraer barrio/distrito (si está disponible)
    let barrio = ''
    if (feature.context && Array.isArray(feature.context)) {
      const neighborhood = feature.context.find(item => 
        item.id && item.id.includes('neighborhood')
      )
      if (neighborhood && neighborhood.text) {
        barrio = neighborhood.text
      }
    }
    
    // Estructura compatible con HereAddressDetails
    const realAddressData = {
      coordenadas: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      direccion_completa: direccionCompleta,
      municipio: municipio || '',
      barrio: barrio || '',
      componentes: {
        // Mapear componentes de Mapbox a formato similar a HERE
        address: direccionCompleta,
        city: municipio,
        district: barrio,
        postalCode: feature.context?.find(item => item.id?.includes('postcode'))?.text || props.postcode || '',
        country: 'Puerto Rico',
        fullAddress: feature.place_name || direccionCompleta
      },
      source: source, // 'autofill', 'manual', 'coordinates'
      originalFeature: feature // Mantener datos originales para debug
    }
    
    return realAddressData
  }, [])

  // ⭐ Función para crear datos de coordenadas (compatible con detalles)
  const createCoordinatesData = useCallback((lat, lng, source = 'coordinates', address = null) => {
    return {
      lat: lat,
      lng: lng,
      coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      source: source,
      timestamp: new Date().toISOString(),
      // Campos adicionales que espera MapboxAddressDetails
      address: address || `Ubicación ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      precision: {
        level: 'high', // Mapbox generalmente tiene buena precisión
        description: 'Precisión alta proporcionada por Mapbox'
      }
    }
  }, [])

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
        
        // Crear datos estructurados para los detalles
        const realAddressData = createRealAddressData(feature, lat, lng, 'manual')
        const coordinatesData = createCoordinatesData(lat, lng, 'manual', realAddressData.direccion_completa)
        
        // Enviar datos a los componentes de detalles
        if (onRealAddressUpdate) {
          onRealAddressUpdate(realAddressData)
          console.log('📊 Datos de dirección real enviados (manual):', realAddressData)
        }
        
        if (onCoordinatesDataUpdate) {
          onCoordinatesDataUpdate(coordinatesData)
          console.log('📍 Datos de coordenadas enviados (manual):', coordinatesData)
        }
        
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
  }, [onAddressSelect, createRealAddressData, createCoordinatesData, onRealAddressUpdate, onCoordinatesDataUpdate])

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
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${import.meta.env.VITE_MAPBOX_API_KEY}&` +
        `language=es&` +
        `country=pr&` +
        `types=address,poi,place,postcode,locality,neighborhood&` +
        `limit=1&` +
        `routing=false`
      
      console.log('🌐 Llamando a Mapbox Geocoding API:', geocodingUrl.replace(import.meta.env.VITE_MAPBOX_API_KEY, 'API_KEY_HIDDEN'))
      console.log('🌐 Coordenadas a procesar:', { lat, lng })
      
      const response = await fetch(geocodingUrl)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Mapbox API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Mapbox API error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('🗺️ Reverse geocoding response:', data)
      console.log('🗺️ Features encontrados:', data.features?.length || 0)
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const props = feature.properties || {}
        console.log('🏠 Feature seleccionado:', feature)
        console.log('🏠 Properties:', props)
        console.log('🏠 Place name:', feature.place_name)
        console.log('🏠 Context:', feature.context)
        
        // Extraer dirección de manera más robusta
        let addressLine1 = ''
        
        // Prioridad 1: Usar address del properties
        if (props.address) {
          addressLine1 = props.address
        }
        // Prioridad 2: Usar house_number + text si están disponibles
        else if (feature.text) {
          if (props.house_number) {
            addressLine1 = `${feature.text} ${props.house_number}`
          } else {
            addressLine1 = feature.text
          }
        }
        // Prioridad 3: Extraer la primera parte del place_name
        else if (feature.place_name) {
          const parts = feature.place_name.split(',')
          addressLine1 = parts[0].trim()
        }
        // Fallback: Mostrar coordenadas formateadas
        else {
          addressLine1 = `Ubicación ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }
        
        console.log('🏠 Dirección extraída:', addressLine1)
        
        // Actualizar campo de dirección
        if (addressLine1) {
          setValue('line1', addressLine1)
        }
        
        // Extraer municipio desde context
        let municipio = ''
        if (feature.context && Array.isArray(feature.context)) {
          // Buscar place (municipio)
          const place = feature.context.find(item => 
            item.id && (item.id.includes('place') || item.id.includes('locality'))
          )
          if (place && place.text) {
            municipio = place.text
            setValue('municipio', municipio)
            console.log('🏛️ Municipio encontrado:', municipio)
          }
          
          // Buscar código postal si está disponible
          const postcode = feature.context.find(item => 
            item.id && item.id.includes('postcode')
          )
          if (postcode && postcode.text) {
            setValue('zipCode', postcode.text)
            console.log('📮 Código postal encontrado:', postcode.text)
          }
        }
        
        // Estado siempre Puerto Rico
        setValue('state', 'Puerto Rico')
        
        // Crear datos estructurados para los detalles
        const realAddressData = createRealAddressData(feature, lat, lng, 'coordinates')
        const coordinatesData = createCoordinatesData(lat, lng, 'coordinates', realAddressData.direccion_completa)
        
        // Enviar datos a los componentes de detalles
        if (onRealAddressUpdate) {
          onRealAddressUpdate(realAddressData)
          console.log('📊 Datos de dirección real enviados (coordenadas):', realAddressData)
        }
        
        if (onCoordinatesDataUpdate) {
          onCoordinatesDataUpdate(coordinatesData)
          console.log('📍 Datos de coordenadas enviados:', coordinatesData)
        }
        
        // Actualizar el mapa
        if (onAddressSelect) {
          onAddressSelect({ 
            feature, 
            lat, 
            lng, 
            source: 'coordinates',
            coordinates: `${lat}, ${lng}`,
            formData: {
              line1: addressLine1,
              municipio: municipio || '',
              state: 'Puerto Rico',
              zipCode: feature.context?.find(item => item.id?.includes('postcode'))?.text || ''
            }
          })
        }
        
        setSearchStatus({
          type: 'success',
          message: `✅ Coordenadas procesadas: ${addressLine1}${municipio ? `, ${municipio}` : ''}`
        })
        
      } else {
        console.log('⚠️ No se encontró dirección para las coordenadas')
        
        // Aún así actualizar el mapa con las coordenadas
        const fallbackAddress = `Ubicación ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        setValue('line1', fallbackAddress)
        setValue('state', 'Puerto Rico')
        
        // Crear datos estructurados básicos para los detalles (sin feature)
        const basicRealAddressData = {
          coordenadas: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          direccion_completa: fallbackAddress,
          municipio: '',
          barrio: '',
          componentes: {
            address: fallbackAddress,
            city: '',
            district: '',
            postalCode: '',
            country: 'Puerto Rico',
            fullAddress: fallbackAddress
          },
          source: 'coordinates',
          originalFeature: null
        }
        const coordinatesData = createCoordinatesData(lat, lng, 'coordinates', fallbackAddress)
        
        // Enviar datos a los componentes de detalles
        if (onRealAddressUpdate) {
          onRealAddressUpdate(basicRealAddressData)
          console.log('📊 Datos básicos de coordenadas enviados:', basicRealAddressData)
        }
        
        if (onCoordinatesDataUpdate) {
          onCoordinatesDataUpdate(coordinatesData)
          console.log('📍 Datos de coordenadas enviados:', coordinatesData)
        }
        
        if (onAddressSelect) {
          onAddressSelect({ 
            lat, 
            lng, 
            source: 'coordinates',
            coordinates: `${lat}, ${lng}`,
            formData: {
              line1: fallbackAddress,
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
      setCoordinatesError(`❌ Error al procesar coordenadas: ${error.message}`)
      setSearchStatus({
        type: 'error',
        message: `❌ Error al procesar coordenadas: ${error.message}`
      })
    } finally {
      setIsValidatingCoords(false)
    }
  }, [validateCoordinates, setValue, onAddressSelect, createRealAddressData, createCoordinatesData, onRealAddressUpdate, onCoordinatesDataUpdate])

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
    console.log('📍 Event structure:', {
      hasFeatures: !!e?.features,
      featuresLength: e?.features?.length,
      firstFeature: e?.features?.[0],
      eventKeys: Object.keys(e || {})
    })
    
    const feature = e?.features?.[0]
    if (!feature) {
      console.log('❌ No feature found in retrieve event')
      console.log('❌ Event data:', e)
      return
    }

    console.log('✅ Feature found:', feature)
    console.log('✅ Feature properties:', feature.properties)
    console.log('✅ Feature geometry:', feature.geometry)
    const props = feature.properties
    const [lng, lat] = feature.geometry?.coordinates || []
    
    console.log('✅ Extracted coordinates:', { lat, lng })
    
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
    
    // Crear datos estructurados para los detalles
    const realAddressData = createRealAddressData(feature, lat, lng, 'autofill')
    const coordinatesData = createCoordinatesData(lat, lng, 'autofill', realAddressData.direccion_completa)
    
    // Enviar datos a los componentes de detalles
    if (onRealAddressUpdate) {
      onRealAddressUpdate(realAddressData)
      console.log('📊 Datos de dirección real enviados:', realAddressData)
    }
    
    if (onCoordinatesDataUpdate) {
      onCoordinatesDataUpdate(coordinatesData)
      console.log('📍 Datos de coordenadas enviados:', coordinatesData)
    }
    
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
  }, [setValue, onAddressSelect, createRealAddressData, createCoordinatesData, onRealAddressUpdate, onCoordinatesDataUpdate])

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

  // Fallback: Detectar selección por cambio abrupto en el input
  const lastInputRef = useRef('')
  
  const handleInputChangeWithFallback = useCallback((e) => {
    const value = e.target.value
    const previousValue = lastInputRef.current
    
    console.log('🔍 Input change detected:', { 
      newValue: value, 
      previousValue: previousValue,
      lengthDiff: Math.abs(value.length - previousValue.length)
    })
    
    // Si el cambio es abrupto (más de 10 caracteres de diferencia), 
    // probablemente sea una selección de autofill
    if (previousValue && Math.abs(value.length - previousValue.length) > 10) {
      console.log('🤔 Posible selección de autofill detectada por cambio abrupto')
      console.log('🤔 Intentando búsqueda manual como fallback...')
      
      // Intentar geocodificar como fallback
      setTimeout(async () => {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?` +
            `access_token=${import.meta.env.VITE_MAPBOX_API_KEY}&` +
            `bbox=-67.945404,17.881325,-65.220703,18.515683&` +
            `language=es&` +
            `limit=1`
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data.features && data.features.length > 0) {
              console.log('✅ Fallback geocoding exitoso:', data.features[0])
              
              // Simular el evento de retrieve que no llegó
              const mockEvent = {
                features: data.features
              }
              handleAutofillRetrieve(mockEvent)
            }
          }
        } catch (error) {
          console.log('❌ Fallback geocoding falló:', error)
        }
      }, 500) // Esperar un poco para asegurar que no llegue el evento real
    }
    
    lastInputRef.current = value
    handleInputChange(e)
  }, [handleInputChange, handleAutofillRetrieve])

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
      // Buscar elementos de Mapbox más específicos
      const autofillElements = document.querySelectorAll('[data-search-js-autofill]')
      const mapboxElements = document.querySelectorAll('[class*="mbx"], [class*="mapbox"], [class*="Results"], [class*="Suggestion"]')
      const suggestionsElements = document.querySelectorAll('[data-search-js-autofill] ul, [data-search-js-autofill] div, [class*="Results"], [class*="Suggestion"]')
      
      console.log('🔍 DOM Debug (Búsqueda ampliada):')
      console.log('- Elementos con data-search-js-autofill:', autofillElements.length)
      console.log('- Elementos con clases de Mapbox:', mapboxElements.length)
      console.log('- Posibles contenedores de sugerencias:', suggestionsElements.length)
      
      // Log detallado de elementos de Mapbox
      if (mapboxElements.length > 0) {
        console.log('✅ Elementos de Mapbox encontrados!')
        mapboxElements.forEach((el, index) => {
          console.log(`- Mapbox Element ${index}:`, {
            element: el,
            className: el.className,
            visible: window.getComputedStyle(el).display !== 'none',
            ariaHidden: el.getAttribute('aria-hidden'),
            children: el.children.length
          })
        })
      }
      
      if (suggestionsElements.length > 0) {
        console.log('✅ Se encontraron contenedores de sugerencias!')
        suggestionsElements.forEach((el, index) => {
          console.log(`- Container ${index}:`, {
            element: el,
            className: el.className,
            visible: window.getComputedStyle(el).display !== 'none',
            ariaHidden: el.getAttribute('aria-hidden')
          })
        })
      } else {
        console.log('❌ No se encontraron contenedores de sugerencias')
      }
    }
    
    // Ejecutar check después de que el componente esté completamente cargado
    const timer = setTimeout(checkForSuggestions, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  // Debug: Monitorear eventos de Mapbox Search JS a nivel global
  useEffect(() => {
    // Agregar listener global para eventos de click en sugerencias
    document.addEventListener('click', (e) => {
      const target = e.target
      if (target.closest('[data-search-js-autofill]')) {
        console.log('🖱️ Click detectado en área de autofill:', {
          target: target,
          targetText: target.textContent,
          isListItem: target.tagName === 'LI',
          hasRole: target.hasAttribute('role'),
          role: target.getAttribute('role'),
          dataAttributes: [...target.attributes].filter(attr => attr.name.startsWith('data-'))
        })
      }
    }, true) // Usar capture para capturar antes que otros handlers
    
    return () => {
      // Cleanup si es necesario
    }
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
          /* ESTILOS MEJORADOS PARA DEBUGGING Y FUNCIONALIDAD */
          [data-search-js-autofill] {
            position: relative !important;
            z-index: 1000 !important;
          }
          
          /* Contenedor de sugerencias - más específico */
          [data-search-js-autofill] ul,
          [data-search-js-autofill] div[role="listbox"],
          [data-search-js-autofill] .suggestions,
          [data-search-js-autofill] .mapboxgl-ctrl-geocoder--suggestions {
            position: absolute !important;
            top: 100% !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 1001 !important;
            background: white !important;
            border: 2px solid red !important; /* DEBUG: Border rojo para ver dónde está */
            border-radius: 4px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
            max-height: 300px !important;
            overflow-y: auto !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
          }
          
          /* Items de sugerencias - más específico */
          [data-search-js-autofill] li,
          [data-search-js-autofill] div[role="option"],
          [data-search-js-autofill] .suggestion,
          [data-search-js-autofill] .mapboxgl-ctrl-geocoder--suggestion {
            padding: 12px 16px !important;
            background: yellow !important; /* DEBUG: Fondo amarillo para ver elementos */
            cursor: pointer !important;
            color: black !important;
            border-bottom: 1px solid #e5e7eb !important;
            display: block !important;
            user-select: none !important;
            pointer-events: auto !important; /* Asegurar que sean clicables */
            min-height: 20px !important;
            line-height: 1.4 !important;
          }
          
          /* Hover states */
          [data-search-js-autofill] li:hover,
          [data-search-js-autofill] div[role="option"]:hover,
          [data-search-js-autofill] .suggestion:hover,
          [data-search-js-autofill] .mapboxgl-ctrl-geocoder--suggestion:hover {
            background: orange !important; /* DEBUG: Naranja en hover */
          }
          
          /* Estados activos */
          [data-search-js-autofill] li:active,
          [data-search-js-autofill] div[role="option"]:active,
          [data-search-js-autofill] .suggestion:active,
          [data-search-js-autofill] .mapboxgl-ctrl-geocoder--suggestion:active {
            background: red !important; /* DEBUG: Rojo cuando se clickea */
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
          
          /* Animación de spinning para coordenadas */
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
                onChange={(e) => {
                  console.log('📝 AddressAutofill onChange triggered:', e.target?.value || e)
                  console.log('📝 Input value:', e.target?.value)
                  console.log('📝 Event target:', e.target)
                  
                  // Si el cambio incluye coordenadas, podría ser una selección
                  if (e.target?.value && e.target.value.includes(',')) {
                    console.log('🤔 Posible selección detectada en onChange')
                  }
                  
                  // Llamar al handler original
                  handleInputChangeWithFallback(e)
                }}
                onSuggest={(e) => {
                  console.log('📝 AddressAutofill onSuggest triggered:', e)
                  console.log('📝 Number of suggestions:', e.suggestions ? e.suggestions.length : 0)
                  if (e.suggestions && e.suggestions.length > 0) {
                    console.log('📝 First suggestion:', e.suggestions[0])
                    console.log('📝 All suggestions:', e.suggestions)
                  }
                  
                  // Debug: Verificar si las sugerencias son clicables después de renderizar
                  setTimeout(() => {
                    // Buscar elementos con clases específicas de Mapbox
                    const mapboxSuggestions = document.querySelectorAll('[class*="mbx"][class*="Suggestion"], [class*="mapbox"][class*="suggestion"]')
                    const allPossibleSuggestions = document.querySelectorAll(
                      '[data-search-js-autofill] li, ' +
                      '[data-search-js-autofill] .suggestion, ' +
                      '[data-search-js-autofill] [role="option"], ' +
                      '[class*="mbx"][class*="Suggestion"], ' +
                      '[class*="Results"] > div'
                    )
                    
                    console.log('🖱️ Elementos de sugerencia encontrados (ampliado):', allPossibleSuggestions.length)
                    console.log('🖱️ Elementos Mapbox específicos:', mapboxSuggestions.length)
                    
                    allPossibleSuggestions.forEach((el, index) => {
                      console.log(`🖱️ Sugerencia ${index}:`, {
                        element: el,
                        text: el.textContent,
                        className: el.className,
                        id: el.id,
                        clickable: window.getComputedStyle(el).pointerEvents !== 'none',
                        visible: window.getComputedStyle(el).display !== 'none',
                        ariaHidden: el.getAttribute('aria-hidden'),
                        zIndex: window.getComputedStyle(el).zIndex,
                        hasClickHandler: !!el.onclick
                      })
                      
                      // Agregar listener manual para debugging
                      el.addEventListener('click', (event) => {
                        console.log('🖱️ CLICK MANUAL en sugerencia:', {
                          index,
                          text: el.textContent,
                          event: event,
                          className: el.className
                        })
                        
                        // Si detectamos el click pero no se ejecuta onRetrieve, 
                        // intentar extraer la información y hacer geocoding manual
                        if (el.textContent) {
                          console.log('🔄 Intentando procesar selección manual...')
                          setTimeout(() => {
                            handleInputChangeWithFallback({ target: { value: el.textContent } })
                          }, 100)
                        }
                      }, { once: true })
                    })
                  }, 200) // Aumentar tiempo para que Mapbox renderice
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
                  onChange={handleInputChangeWithFallback}
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
              <br />
              <span style={{ color: '#059669', fontSize: '0.7rem' }}>
                💡 Prueba con: <strong>18.4655, -66.1057</strong> (San Juan Centro) para ver el reverse geocoding
              </span>
            </small>
            
            <div className="coordinates-container" style={{ position: 'relative' }}>
              <input
                type="text"
                id="coordinates"
                value={manualCoordinates}
                onChange={handleCoordinatesChange}
                placeholder="18.4655, -66.1057"
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
                  padding: '6px 10px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    border: '2px solid #bae6fd', 
                    borderTop: '2px solid #0ea5e9',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span><strong>Buscando dirección...</strong> Convirtiendo coordenadas a dirección física</span>
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
