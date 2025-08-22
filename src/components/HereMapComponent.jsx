import React, { useEffect, useRef, useState } from 'react'

const HereMapComponent = ({ location }) => {
  const mapRef = useRef(null)
  const map = useRef(null)
  const platform = useRef(null)
  const marker = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hereApi, setHereApi] = useState(null)

  useEffect(() => {
    const apikey = import.meta.env.VITE_HERE_API_KEY

    if (!apikey) {
      setError('HERE API Key no configurada')
      setIsLoading(false)
      return
    }

    // Función principal que maneja el import del paquete HERE
    const initializeHereAPI = async () => {
      try {
        console.log('🚀 Iniciando import del paquete HERE Maps...')

        // Importar el paquete y obtener H desde window/global después de la carga
        await import('@here/maps-api-for-javascript')
        
        // Esperar un poco para que el script se ejecute completamente
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verificar si H está disponible en window/global
        const H = window.H || globalThis.H
        console.log('🔍 H disponible:', H)
        
        if (!H) {
          throw new Error('HERE Maps API no se cargó correctamente en window.H')
        }
        
        if (!H.service) {
          throw new Error('H.service no está disponible')
        }
        
        console.log('✅ HERE Maps API cargado desde NPM package')
        setHereApi(H)
        setIsLoading(false)
        
      } catch (error) {
        console.error('❌ Error cargando HERE Maps API:', error)
        setError(error.message)
        setIsLoading(false)
      }
    }

    initializeHereAPI()
  }, [])

  // Efecto para crear el mapa una vez que tenemos la API
  useEffect(() => {
    if (!hereApi || !mapRef.current) return

    const apikey = import.meta.env.VITE_HERE_API_KEY

    try {
      console.log('📍 Creando mapa con HERE API cargada...')
      console.log('🔑 API Key presente:', apikey ? 'Sí' : 'No')

      // Check if the map object has already been created
      if (!map.current) {
        // Create a platform object with the API key
        platform.current = new hereApi.service.Platform({
          apikey: apikey,
          useCors: true
        })

        // Obtain the default map types from the platform object
        const defaultLayers = platform.current.createDefaultLayers({
          pois: true,
          tileSize: 512,
          ppi: 320
        })

        console.log('🗺️ Capas disponibles:', Object.keys(defaultLayers))
        console.log('🗺️ Vector layers:', Object.keys(defaultLayers.vector))

        // Try different layer types in case vector doesn't work
        let mapLayer
        if (defaultLayers.vector && defaultLayers.vector.normal && defaultLayers.vector.normal.map) {
          mapLayer = defaultLayers.vector.normal.map
          console.log('✅ Usando capa vector.normal.map')
        } else if (defaultLayers.raster && defaultLayers.raster.normal && defaultLayers.raster.normal.map) {
          mapLayer = defaultLayers.raster.normal.map
          console.log('✅ Usando capa raster.normal.map como fallback')
        } else {
          throw new Error('No se encontraron capas de mapa válidas')
        }

        // Create a new map instance
        const newMap = new hereApi.Map(
          mapRef.current,
          mapLayer,
          {
            zoom: 9, // Zoom más amplio para mostrar toda la isla
            center: {
              lat: 18.2000, // Centro geográfico de Puerto Rico
              lng: -66.4000, // Longitud ajustada para mejor centramiento
            },
            pixelRatio: window.devicePixelRatio || 1
          }
        )

        // Add panning and zooming behavior to the map
        const mapEvents = new hereApi.mapevents.MapEvents(newMap)
        const behavior = new hereApi.mapevents.Behavior(mapEvents)
        
        // Habilitar todas las interacciones - sin parámetros específicos
        behavior.enable()  // Esto habilita todos los comportamientos por defecto
        console.log('🎮 HERE - Controles de interacción configurados')

        // Add UI controls - usar el constructor correcto
        let _ui
        try {
          // Opción 1: Crear UI con constructor básico
          _ui = new hereApi.ui.UI(newMap)
          console.log('🖱️ HERE - UI básico creado exitosamente')
        } catch (uiError) {
          console.warn('⚠️ HERE - No se pudo crear UI:', uiError.message)
          // Continuar sin UI - no es crítico
        }

        // Set the map object to the reference
        map.current = newMap

        console.log('✅ Mapa HERE creado exitosamente con NPM package')
        console.log('🗺️ Centro del mapa:', newMap.getCenter())
        console.log('🔍 Zoom del mapa:', newMap.getZoom())
        console.log('📱 Tamaño del contenedor:', mapRef.current.offsetWidth, 'x', mapRef.current.offsetHeight)
        console.log('🎮 Comportamientos configurados correctamente')
        
        // Verificar que las tiles se están cargando
        newMap.addEventListener('tileload', () => {
          console.log('🎯 Tile cargado exitosamente')
        })
        
        newMap.addEventListener('tileerror', (event) => {
          console.error('❌ Error cargando tile:', event)
        })
        
        // Forzar redibujado del mapa
        setTimeout(() => {
          if (newMap && newMap.getViewPort) {
            newMap.getViewPort().resize()
            console.log('🔄 Mapa redimensionado')
          }
        }, 100)
        
        // Añadir evento para verificar interactividad
        newMap.addEventListener('tap', () => {
          console.log('👆 HERE - Tap detectado en el mapa')
        })
        
        newMap.addEventListener('drag', () => {
          console.log('🖱️ HERE - Drag detectado en el mapa')
        })
      }
    } catch (error) {
      console.error('❌ Error creando mapa:', error)
      console.error('❌ Stack trace:', error.stack)
      setError(`Error creando mapa: ${error.message}`)
    }
  }, [hereApi])

  // useEffect para manejar cambios en la ubicación - SOLO cuando location cambie
  useEffect(() => {
    // Verificaciones más estrictas para evitar bucles infinitos
    if (!map.current) {
      console.log('🚫 HERE - Mapa no existe aún')
      return
    }
    
    if (!hereApi) {
      console.log('🚫 HERE - HERE API no está disponible aún')
      return
    }
    
    if (!location || !location.lat || !location.lng) {
      console.log('🚫 HERE - Ubicación no válida:', location)
      return
    }

    console.log('📍 HERE - Actualizando ubicación del mapa:', location)

    try {
      // Remover marcador anterior si existe
      if (marker.current) {
        map.current.removeObject(marker.current)
        marker.current = null
        console.log('🗑️ HERE - Marcador anterior removido')
      }

      // Crear nuevo marcador con coordenadas correctas
      const markerLocation = { lat: location.lat, lng: location.lng }
      
      // Crear marcador usando un ícono simple que funcione garantizado
      let newMarker
      try {
        // Opción 1: Marcador básico sin ícono personalizado
        newMarker = new hereApi.map.Marker(markerLocation)
        console.log('📌 HERE - Marcador básico creado')
      } catch (basicError) {
        console.warn('⚠️ HERE - Error con marcador básico:', basicError.message)
        try {
          // Opción 2: Marcador con DomIcon simple
          const domIcon = new hereApi.map.DomIcon('<div style="background-color: red; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>')
          newMarker = new hereApi.map.Marker(markerLocation, { icon: domIcon })
          console.log('📌 HERE - Marcador con DomIcon creado')
        } catch (domError) {
          console.error('❌ HERE - Error creando cualquier tipo de marcador:', domError.message)
          throw domError
        }
      }
      
      // Añadir marcador al mapa
      map.current.addObject(newMarker)
      marker.current = newMarker
      console.log('📌 HERE - Nuevo marcador añadido en:', markerLocation)

      // Centrar mapa en la nueva ubicación usando el método correcto
      map.current.setCenter(markerLocation)
      map.current.setZoom(17)
      
      // Forzar actualización del viewport
      setTimeout(() => {
        if (map.current && map.current.getViewPort) {
          map.current.getViewPort().resize()
          console.log('🔄 HERE - Viewport actualizado')
        }
      }, 100)
      
      console.log('🎯 HERE - Mapa centrado en nueva ubicación con zoom 17')

      console.log('✅ HERE - Ubicación actualizada exitosamente')

    } catch (error) {
      console.error('❌ HERE - Error actualizando ubicación:', error)
      console.error('❌ HERE - Stack trace:', error.stack)
    }
  }, [location, hereApi]) // REMOVIDO addressData de las dependencias

  // Cleanup
  useEffect(() => {
    return () => {
      if (map.current) {
        try {
          map.current.dispose()
          map.current = null
        } catch (e) {
          console.warn('Error al limpiar mapa:', e)
        }
      }
    }
  }, [])

  if (error) {
    return (
      <div style={{
        width: "100%",
        height: "500px",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        flexDirection: 'column'
      }}>
        <div style={{ textAlign: 'center', color: '#dc3545' }}>
          <h3>Error en HERE Maps (Workaround)</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !hereApi) {
    return (
      <div style={{
        width: "100%",
        height: "500px",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        flexDirection: 'column'
      }}>
        <div style={{ textAlign: 'center', color: '#6c757d' }}>
          <div style={{ 
            marginBottom: '15px',
            width: '40px',
            height: '40px',
            border: '4px solid #e9ecef',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <h3>Cargando HERE Maps Workaround</h3>
          <p>Import NPM + window.H fallback</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div>
      <h3>HERE Maps - NPM Workaround</h3>
      <div
        style={{
          width: "100%",
          height: "500px",
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: '#f8f9fa', // Fondo visible para debug
          position: 'relative'
        }}
        ref={mapRef}
      >
        {/* Overlay de debug para verificar que el contenedor está visible */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '3px',
          fontSize: '12px',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          Contenedor: {mapRef.current ? `${mapRef.current.offsetWidth}x${mapRef.current.offsetHeight}` : 'No disponible'}
        </div>
      </div>
    </div>
  )
}

export default HereMapComponent
