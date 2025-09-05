import { useState } from 'react'
import MapboxAddressFormWorking from '../components/MapboxAddressFormWorking'
import MapboxDebugTest from '../components/MapboxDebugTest'

const TestSimpleMapbox = () => {
  const [addressData, setAddressData] = useState(null)
  const [realAddressData, setRealAddressData] = useState(null)

  const handleRealAddressUpdate = (data) => {
    console.log('📍 Dirección actualizada:', data)
    setRealAddressData(data)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* 🔍 Debug Test - Siempre primero */}
      <MapboxDebugTest />
      
      <div>
        {/* 🆕 Versión WORKING - API Nueva que SÍ funciona */}
        <div style={{ 
          marginBottom: '32px',
          padding: '24px',
          background: 'linear-gradient(135deg, #dcfce7 0%, #22c55e 100%)',
          borderRadius: '16px',
          border: '4px solid #16a34a',
          boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)'
        }}>
          <h1 style={{ color: 'white', marginBottom: '16px', textAlign: 'center', fontSize: '1.8rem' }}>
            🆕 VERSIÓN WORKING - API Nueva que SÍ Funciona! 🆕
          </h1>
          <div style={{ 
            background: '#ffffff', 
            padding: '20px', 
            borderRadius: '12px',
            border: '2px solid #bbf7d0'
          }}>
            <MapboxAddressFormWorking
              setAddressData={setAddressData}
              onRealAddressUpdate={handleRealAddressUpdate}
            />
          </div>
        </div>

        {/* Debug info */}
        {addressData && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '8px',
            color: 'white' 
          }}>
            <h3>📍 Datos de Dirección:</h3>
            <pre>{JSON.stringify(addressData, null, 2)}</pre>
          </div>
        )}

        {realAddressData && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: 'rgba(34,197,94,0.2)', 
            borderRadius: '8px',
            color: 'white',
            border: '2px solid #22c55e'
          }}>
            <h3>🎯 Dirección Real Capturada:</h3>
            <pre>{JSON.stringify(realAddressData, null, 2)}</pre>
          </div>
        )}

        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#fef3c7', 
          borderRadius: '6px' 
        }}>
          <strong style={{ color: '#92400e' }}>💡 Direcciones de prueba sugeridas:</strong>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <code style={{ background: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Plaza de Armas</code>
            <code style={{ background: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Calle Fortaleza</code>
            <code style={{ background: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Viejo San Juan</code>
            <code style={{ background: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Plaza Las Américas</code>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestSimpleMapbox