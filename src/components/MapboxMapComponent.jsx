import React, { useEffect, useRef, useState, useCallback } from 'react'

const MapboxMapComponent = ({ location, addressData }) => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)
  const loadTimeoutRef = useRef(null)
  const hasInitialized = useRef(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  const [mapboxReady, setMapboxReady] = useState(false)

  // Función para agregar información de debug (estable entre renderizados)
  const addDebugInfo = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => [...prev.slice(-19), { message, type, timestamp }])
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`)
  }, [])

  // Función para cargar Mapbox GL JS desde CDN
  const loadMapboxGL = useCallback(() => {
    // CSS
    if (!document.querySelector('link[data-mapbox-gl-css]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
      link.setAttribute('data-mapbox-gl-css', 'true')
      document.head.appendChild(link)
      addDebugInfo('📦 CSS de Mapbox cargado', 'info')
    }

    // JS
    const ready = () => {
      addDebugInfo('✅ Mapbox GL JS cargado', 'success')
      setMapboxReady(true)
    }

    if (window.mapboxgl) {
      ready()
      return
    }

    let script = document.querySelector('script[data-mapbox-gl-js]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
      script.async = true
      script.defer = true
      script.setAttribute('data-mapbox-gl-js', 'true')
      document.head.appendChild(script)
      addDebugInfo('📦 Cargando Mapbox GL JS desde CDN...', 'info')
    }

    script.addEventListener('load', ready, { once: true })
    script.addEventListener('error', () => {
      addDebugInfo('❌ Error cargando Mapbox GL JS desde CDN', 'error')
      setError('Error cargando Mapbox GL JS desde CDN')
      setIsLoading(false)
    }, { once: true })
  }, [addDebugInfo, setMapboxReady, setError, setIsLoading])

  // Verificar configuración inicial
  useEffect(() => {
    addDebugInfo('Inicializando componente MapboxMapComponent', 'info')
    
    // Verificar token
    const token = import.meta.env.VITE_MAPBOX_API_KEY
    if (!token) {
      addDebugInfo('❌ VITE_MAPBOX_API_KEY no configurado', 'error')
      setError('Token de Mapbox no configurado. Verifica VITE_MAPBOX_API_KEY')
      setIsLoading(false)
      return
    }
    
    addDebugInfo(`✅ Token encontrado (${token.length} chars)`, 'success')

    // Verificar si mapboxgl está disponible globalmente
    if (typeof window !== 'undefined' && window.mapboxgl) {
      addDebugInfo('✅ mapboxgl encontrado en window', 'success')
      setMapboxReady(true)
    } else {
      addDebugInfo('⚠️ mapboxgl no encontrado, cargando desde CDN...', 'warning')
      loadMapboxGL()
    }
  }, [loadMapboxGL, addDebugInfo, setError, setIsLoading, setMapboxReady])

  // Inicializar el mapa cuando mapboxgl esté listo
  useEffect(() => {
    if (!mapboxReady || map.current || !mapContainer.current || hasInitialized.current) return
    hasInitialized.current = true

    // WebGL check
    const mapboxgl = window.mapboxgl
    if (!mapboxgl?.supported?.() || !mapboxgl) {
      setError('Este navegador no soporta WebGL para Mapbox.')
      setIsLoading(false)
      return
    }

    try {
      addDebugInfo('🗺️ Inicializando mapa de Mapbox...', 'info')
      const token = import.meta.env.VITE_MAPBOX_API_KEY
      if (!token || !token.startsWith('pk.')) {
        setError('Token de Mapbox inválido. Debe ser público (pk.*).')
        setIsLoading(false)
        return
      }
      
      mapboxgl.accessToken = token
      addDebugInfo('🔑 Token asignado a mapboxgl', 'info')

      // Asegurar layout listo
      requestAnimationFrame(() => {
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-66.4, 18.2],
          zoom: 9,
          pitch: 0,
          bearing: 0
        })
        map.current = mapInstance
        addDebugInfo('✅ Instancia de mapa creada', 'success')

        // Controles
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right')
        mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-left')

        // Resize si cambia el contenedor (tabs/modals)
        const ro = new ResizeObserver(() => {
          map.current?.resize()
        })
        ro.observe(mapContainer.current)
        mapInstance.on('remove', () => ro.disconnect())

        mapInstance.on('load', () => {
          addDebugInfo('✅ Mapa cargado completamente', 'success')
          setIsLoading(false)
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
          // Primer resize por si el contenedor nació oculto
          mapInstance.resize()
        })

        mapInstance.on('error', (e) => {
          addDebugInfo(`❌ Error en mapa: ${e.error?.message || e.message}`, 'error')
          setError(`Error cargando el mapa: ${e.error?.message || 'Error desconocido'}`)
          setIsLoading(false)
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
        })

        mapInstance.on('styledata', () => {
          addDebugInfo('🎨 Estilo del mapa cargado', 'info')
        })

        mapInstance.on('sourcedata', () => {
          addDebugInfo('📊 Datos de fuente cargados', 'info')
        })

        // Timeout de seguridad
        loadTimeoutRef.current = setTimeout(() => {
          addDebugInfo('⏰ Timeout: mapa tardó demasiado en cargar', 'error')
          setError('El mapa tardó demasiado en cargar. Verifica tu conexión.')
          setIsLoading(false)
        }, 15000)
      })
    } catch (err) {
      addDebugInfo(`❌ Error inicializando: ${err.message}`, 'error')
      setError(`Error inicializando mapa: ${err.message}`)
      setIsLoading(false)
    }
  }, [mapboxReady, addDebugInfo, setError, setIsLoading]) // addDebugInfo es estable

  // Manejar cambios en la ubicación
  useEffect(() => {
    if (!map.current || !location || !location.lat || !location.lng) {
      return
    }

    addDebugInfo(`📍 Actualizando ubicación: ${location.lat}, ${location.lng}`, 'info')

    try {
      const mapboxgl = window.mapboxgl
      
      // Remover marcador anterior si existe
      if (marker.current) {
        marker.current.remove()
        marker.current = null
        addDebugInfo('🗑️ Marcador anterior removido', 'info')
      }

      // Crear nuevo marcador
      const newMarker = new mapboxgl.Marker({
        color: '#FF0000',
        draggable: false
      })
        .setLngLat([location.lng, location.lat])
        .addTo(map.current)

      marker.current = newMarker
      addDebugInfo('📌 Nuevo marcador agregado', 'success')

      // Centrar mapa en la nueva ubicación
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 17,
        duration: 2000,
        essential: true
      })

      addDebugInfo('🎯 Mapa centrado en nueva ubicación', 'success')

      // Añadir popup con información si hay datos de dirección
      if (addressData && (addressData.linea1 || addressData.municipio)) {
        const popupContent = `
          <div style="padding: 12px; max-width: 250px; font-family: system-ui, sans-serif;">
            <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">📍 Dirección</h4>
            ${addressData.linea1 ? `<p style="margin: 6px 0; font-size: 14px;"><strong>Línea 1:</strong> ${addressData.linea1}</p>` : ''}
            ${addressData.linea2 ? `<p style="margin: 6px 0; font-size: 14px;"><strong>Línea 2:</strong> ${addressData.linea2}</p>` : ''}
            ${addressData.municipio ? `<p style="margin: 6px 0; font-size: 14px;"><strong>Municipio:</strong> ${addressData.municipio}</p>` : ''}
            ${addressData.barrio ? `<p style="margin: 6px 0; font-size: 14px;"><strong>Barrio:</strong> ${addressData.barrio}</p>` : ''}
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 6px;">
              Coordenadas: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
            </p>
          </div>
        `

        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px',
          className: 'custom-popup'
        })
          .setHTML(popupContent)

        newMarker.setPopup(popup)
        
        // Mostrar popup automáticamente después de la animación
        setTimeout(() => {
          if (newMarker.getPopup()) {
            newMarker.togglePopup()
            addDebugInfo('💬 Popup mostrado', 'info')
          }
        }, 2500)
      }

    } catch (error) {
      addDebugInfo(`❌ Error actualizando ubicación: ${error.message}`, 'error')
    }
  }, [location, addressData, addDebugInfo])

  // Cleanup
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
      if (marker.current) {
        marker.current.remove()
      }
      if (map.current) {
        map.current.remove()
      }
      addDebugInfo('🧹 Componente limpiado', 'info')
    }
  }, [addDebugInfo])

  const retryLoad = () => {
    addDebugInfo('🔄 Reintentando cargar mapa...', 'info')
    setError(null)
    setIsLoading(true)
    setMapboxReady(false)
    if (map.current) {
      map.current.remove()
      map.current = null
    }
    loadMapboxGL()
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          width: "100%",
          minHeight: "400px",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️❌</div>
          <h3 style={{ color: '#dc2626', marginBottom: '12px', fontSize: '20px' }}>Error cargando Mapbox</h3>
          <p style={{ color: '#7f1d1d', marginBottom: '24px', maxWidth: '400px' }}>{error}</p>
          <button 
            onClick={retryLoad}
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            🔄 Reintentar
          </button>
        </div>

        {/* Panel de Debug para errores */}
        <div style={{ 
          marginTop: '24px',
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#475569' }}>🔍 Debug Info</h4>
          {debugInfo.map((info, index) => (
            <div key={index} style={{ 
              margin: '4px 0', 
              fontSize: '13px',
              color: info.type === 'error' ? '#dc2626' : info.type === 'success' ? '#059669' : info.type === 'warning' ? '#d97706' : '#475569'
            }}>
              <span style={{ opacity: 0.7 }}>[{info.timestamp}]</span> {info.message}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          width: "100%",
          height: "400px",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f9ff',
          border: '2px solid #bae6fd',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ 
            marginBottom: '20px',
            width: '60px',
            height: '60px',
            border: '6px solid #e0f2fe',
            borderTop: '6px solid #0284c7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <h3 style={{ color: '#0369a1', marginBottom: '8px' }}>Cargando Mapbox</h3>
          <p style={{ color: '#0284c7', marginBottom: '24px' }}>Inicializando mapa interactivo...</p>
          
          {/* Debug info en tiempo real */}
          <div style={{ 
            background: 'white', 
            padding: '12px', 
            borderRadius: '6px', 
            maxWidth: '400px',
            fontSize: '12px',
            color: '#475569'
          }}>
            <strong>Último evento:</strong>
            {debugInfo.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                {debugInfo[debugInfo.length - 1].message}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        {/* Panel de Debug */}
        <div style={{ 
          marginTop: '24px',
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#475569' }}>🔍 Debug Info</h4>
          {debugInfo.map((info, index) => (
            <div key={index} style={{ 
              margin: '4px 0', 
              fontSize: '13px',
              color: info.type === 'error' ? '#dc2626' : info.type === 'success' ? '#059669' : info.type === 'warning' ? '#d97706' : '#475569'
            }}>
              <span style={{ opacity: 0.7 }}>[{info.timestamp}]</span> {info.message}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h3 style={{ color: '#374151', marginBottom: '16px' }}>🗺️ Ubicación en el Mapa</h3>
      
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "500px",
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          backgroundColor: '#f9fafb',
          position: 'relative'
        }}
      />

      {/* Panel de Debug compacto */}
      <details style={{ marginTop: '16px' }}>
        <summary style={{ cursor: 'pointer', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <span style={{ color: '#475569' }}>🔍 Debug Info ({debugInfo.length} eventos)</span>
        </summary>
        <div style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px',
          marginTop: '8px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {debugInfo.map((info, index) => (
            <div key={index} style={{ 
              margin: '4px 0', 
              fontSize: '13px',
              color: info.type === 'error' ? '#dc2626' : info.type === 'success' ? '#059669' : info.type === 'warning' ? '#d97706' : '#475569'
            }}>
              <span style={{ opacity: 0.7 }}>[{info.timestamp}]</span> {info.message}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

export default MapboxMapComponent