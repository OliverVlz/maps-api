import React, { useState, useEffect } from 'react'
import mapboxConfig from '../config/mapboxConfig'

const MapboxDebugTest = () => {
  const [debugInfo, setDebugInfo] = useState([])
  const [status, setStatus] = useState({ type: 'info', message: 'Iniciando debug...' })

  const addDebugInfo = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => [...prev, { timestamp, message, type }])
  }

  useEffect(() => {
    addDebugInfo('🔍 Iniciando verificación de Mapbox...')
    
    // Verificar configuración
    if (!mapboxConfig.isValid()) {
      addDebugInfo('❌ Configuración de Mapbox inválida', 'error')
      setStatus({ type: 'error', message: 'Token de Mapbox no configurado' })
      return
    }

    addDebugInfo(`✅ Token de Mapbox configurado: ${mapboxConfig.accessToken?.substring(0, 20)}...`)
    
    // Verificar si mapbox-gl está disponible
    try {
      import('mapbox-gl').then(() => {
        addDebugInfo('✅ Mapbox GL JS importado correctamente')
        setStatus({ type: 'success', message: 'Mapbox disponible' })
      }).catch((error) => {
        addDebugInfo(`❌ Error importando Mapbox GL: ${error.message}`, 'error')
        setStatus({ type: 'error', message: 'Error cargando Mapbox GL' })
      })
    } catch (error) {
      addDebugInfo(`❌ Error con Mapbox GL: ${error.message}`, 'error')
      setStatus({ type: 'error', message: 'Mapbox GL no disponible' })
    }

    // Verificar @mapbox/search-js-react
    try {
      import('@mapbox/search-js-react').then((searchReact) => {
        addDebugInfo('✅ @mapbox/search-js-react importado correctamente')
        addDebugInfo(`📦 Componentes disponibles: ${Object.keys(searchReact).join(', ')}`)
      }).catch((error) => {
        addDebugInfo(`❌ Error importando @mapbox/search-js-react: ${error.message}`, 'error')
      })
    } catch (error) {
      addDebugInfo(`❌ Error con @mapbox/search-js-react: ${error.message}`, 'error')
    }
  }, [])

  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const getMessageColor = (type) => {
    switch (type) {
      case 'error': return '#dc2626'
      case 'warning': return '#d97706'
      case 'success': return '#059669'
      default: return '#374151'
    }
  }

  return (
    <div style={{
      margin: '20px 0',
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#f9fafb',
      fontSize: '14px'
    }}>
      <h3 style={{ 
        margin: '0 0 12px 0', 
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🔍 Debug de Mapbox
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: getStatusColor(status.type),
          color: 'white'
        }}>
          {status.message}
        </span>
      </h3>
      
      <div style={{
        maxHeight: '200px',
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        padding: '8px'
      }}>
        {debugInfo.length === 0 ? (
          <p style={{ margin: 0, color: '#6b7280', fontStyle: 'italic' }}>
            Cargando información de debug...
          </p>
        ) : (
          debugInfo.map((info, index) => (
            <div key={index} style={{
              padding: '2px 0',
              borderBottom: index < debugInfo.length - 1 ? '1px solid #f3f4f6' : 'none'
            }}>
              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                [{info.timestamp}]
              </span>
              {' '}
              <span style={{ color: getMessageColor(info.type) }}>
                {info.message}
              </span>
            </div>
          ))
        )}
      </div>
      
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
        💡 Este componente verifica que Mapbox esté configurado correctamente
      </div>
    </div>
  )
}

export default MapboxDebugTest
