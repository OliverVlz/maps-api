import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import mapboxConfig from '../config/mapboxConfig'
import 'mapbox-gl/dist/mapbox-gl.css'

const MapboxMapComponent = ({ location, addressData }) => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Inicializar el mapa
  useEffect(() => {
    if (!mapboxConfig.isValid()) {
      setError('Token de Mapbox no configurado. Verifica VITE_MAPBOX_API_KEY')
      setIsLoading(false)
      return
    }

    if (map.current) return // El mapa ya está inicializado

    try {
      console.log('🗺️ Inicializando mapa de Mapbox...')
      
      mapboxgl.accessToken = mapboxConfig.accessToken

      // Crear el mapa
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-66.4000, 18.2000], // Centro de Puerto Rico
        zoom: 9,
        pitch: 0,
        bearing: 0
      })

      // Eventos del mapa
      map.current.on('load', () => {
        console.log('✅ Mapa de Mapbox cargado exitosamente')
        setIsLoading(false)
        
        // Añadir controles de navegación
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-left')
      })

      map.current.on('error', (e) => {
        console.error('❌ Error en el mapa de Mapbox:', e)
        setError(`Error cargando el mapa: ${e.error?.message || 'Error desconocido'}`)
        setIsLoading(false)
      })

      // Event listeners para interactividad
      map.current.on('click', () => {
        console.log('👆 Click detectado en el mapa')
      })

      map.current.on('move', () => {
        console.log('🖱️ Movimiento detectado en el mapa')
      })

    } catch (error) {
      console.error('❌ Error inicializando mapa:', error)
      setError(`Error inicializando mapa: ${error.message}`)
      setIsLoading(false)
    }
  }, [])

  // Manejar cambios en la ubicación
  useEffect(() => {
    if (!map.current || !location || !location.lat || !location.lng) {
      return
    }

    console.log('📍 Actualizando ubicación del mapa:', location)

    try {
      // Remover marcador anterior si existe
      if (marker.current) {
        marker.current.remove()
        marker.current = null
        console.log('🗑️ Marcador anterior removido')
      }

      // Crear nuevo marcador
      const newMarker = new mapboxgl.Marker({
        color: '#FF0000',
        draggable: false
      })
        .setLngLat([location.lng, location.lat])
        .addTo(map.current)

      marker.current = newMarker
      console.log('📌 Nuevo marcador añadido en:', [location.lng, location.lat])

      // Centrar mapa en la nueva ubicación
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 19,
        duration: 2000,
        essential: true
      })

      console.log('🎯 Mapa centrado en nueva ubicación con zoom 19')

      // Añadir popup con información si hay datos de dirección
      if (addressData && (addressData.linea1 || addressData.municipio)) {
        const popupContent = `
          <div style="padding: 8px; max-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #333;">📍 Dirección</h4>
            ${addressData.linea1 ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Línea 1:</strong> ${addressData.linea1}</p>` : ''}
            ${addressData.linea2 ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Línea 2:</strong> ${addressData.linea2}</p>` : ''}
            ${addressData.municipio ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Municipio:</strong> ${addressData.municipio}</p>` : ''}
            ${addressData.barrio ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Barrio:</strong> ${addressData.barrio}</p>` : ''}
            <p style="margin: 4px 0; font-size: 12px; color: #666;">Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}</p>
          </div>
        `

        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px'
        })
          .setHTML(popupContent)

        newMarker.setPopup(popup)
        
        // Mostrar popup automáticamente
        setTimeout(() => {
          popup.addTo(map.current)
          newMarker.togglePopup()
        }, 2500) // Esperar a que termine la animación de flyTo
      }

      console.log('✅ Ubicación actualizada exitosamente')

    } catch (error) {
      console.error('❌ Error actualizando ubicación:', error)
    }
  }, [location, addressData])

  // Cleanup
  useEffect(() => {
    return () => {
      if (marker.current) {
        marker.current.remove()
      }
      if (map.current) {
        map.current.remove()
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
          <h3>Error en Mapbox</h3>
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

  if (isLoading) {
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
          <h3>Cargando Mapbox</h3>
          <p>Inicializando mapa interactivo...</p>
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
      <h3>Ubicación en el Mapa</h3>
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "500px",
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}
      />
    </div>
  )
}

export default MapboxMapComponent
