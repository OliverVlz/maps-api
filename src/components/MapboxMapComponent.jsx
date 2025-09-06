import React, { useEffect, useRef, useState } from 'react'

const MapboxMapComponent = ({ location, addressData, mapStyle: externalMapStyle }) => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mapStyle, setMapStyle] = useState(externalMapStyle || 'streets-v12')

  // Sincronizar con el estado externo
  useEffect(() => {
    if (externalMapStyle && externalMapStyle !== mapStyle) {
      setMapStyle(externalMapStyle)
    }
  }, [externalMapStyle, mapStyle])

  useEffect(() => {
    // Verificar que el token esté disponible
    const accessToken = import.meta.env.VITE_MAPBOX_API_KEY
    if (!accessToken) {
      setError('Token de Mapbox no configurado')
      setIsLoading(false)
      return
    }

    // Si el mapa ya está inicializado, no hacer nada
    if (map.current) return

    // Función para cargar Mapbox GL JS
    const loadMapbox = () => {
      // Cargar CSS si no existe
      if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
        document.head.appendChild(link)
      }

      // Cargar JS si no existe
      if (window.mapboxgl) {
        initializeMap()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
      script.onload = initializeMap
      script.onerror = () => {
        setError('Error al cargar Mapbox GL JS')
        setIsLoading(false)
      }
      document.head.appendChild(script)
    }

    // Función para inicializar el mapa
    const initializeMap = () => {
      try {
        window.mapboxgl.accessToken = accessToken

        map.current = new window.mapboxgl.Map({
          container: mapContainer.current,
          style: `mapbox://styles/mapbox/${mapStyle}`,
          center: [-66.590149, 18.220833], // Centro de Puerto Rico
          zoom: 8.5, // Zoom para mostrar toda la isla
          maxBounds: [
            [-68.5, 17.5], // Suroeste
            [-65.0, 19.0]  // Noreste
          ]
        })

        map.current.on('load', () => {
          setIsLoading(false)
          console.log('✅ Mapa de Puerto Rico cargado correctamente')
        })

        map.current.on('error', (e) => {
          console.error('❌ Error en el mapa:', e)
          setError('Error al cargar el mapa')
          setIsLoading(false)
        })

      } catch (error) {
        console.error('❌ Error al inicializar mapa:', error)
        setError('Error al inicializar el mapa')
        setIsLoading(false)
      }
    }

    loadMapbox()

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [mapStyle])

  // Efecto para manejar cambios en la ubicación
  useEffect(() => {
    if (!map.current || !location || !location.lat || !location.lng) {
      return
    }

    try {
      // Remover marcador anterior si existe
      if (marker.current) {
        marker.current.remove()
        marker.current = null
      }

      // Crear nuevo marcador
      const newMarker = new window.mapboxgl.Marker({
        color: '#7c3aed',
        draggable: false
      })
        .setLngLat([location.lng, location.lat])
        .addTo(map.current)

      marker.current = newMarker

      // Centrar mapa en la nueva ubicación
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 17,
        duration: 2000,
        essential: true
      })

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

        const popup = new window.mapboxgl.Popup({
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
          }
        }, 2500)
      }

    } catch (error) {
      console.error('❌ Error actualizando ubicación:', error)
    }
  }, [location, addressData])

  // Cleanup para el marcador
  useEffect(() => {
    return () => {
      if (marker.current) {
        marker.current.remove()
      }
    }
  }, [])

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '16px'
      }}>
        ❌ {error}
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ 
        color: 'black', 
        fontSize: '18px',
        marginBottom: '20px' 
      }}>Ubicación en el Mapa</h3>
      <div style={{ position: 'relative', width: '100%', height: '500px' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1000,
          fontSize: '16px',
          color: '#6b7280'
        }}>
          🗺️ Cargando mapa de Puerto Rico...
        </div>
      )}
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          border: '1px solid #d1d5db'
        }}
      />
      </div>
    </div>
  )
}

// Componente separado para el selector de estilos
export const MapboxStyleSelector = ({ mapStyle, onStyleChange, mapStyles }) => {
  return (
    <div style={{ 
      marginTop: '12px',
      padding: '12px',
      backgroundColor: '#f9fafb',
      borderRadius: '6px',
      border: '1px solid #e5e7eb'
    }}>
      <label htmlFor="map-style-select" style={{ 
        display: 'block',
        marginBottom: '6px',
        color: '#6b7280',
        fontSize: '13px',
        fontWeight: '500'
      }}>
        Estilo del mapa
      </label>
      <select
        id="map-style-select"
        value={mapStyle}
        onChange={(e) => onStyleChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          backgroundColor: 'white',
          fontSize: '13px',
          color: '#374151',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        {mapStyles.map((style) => (
          <option key={style.id} value={style.id}>
            {style.name}
          </option>
        ))}
      </select>
    </div>
  )
}
export default MapboxMapComponent
