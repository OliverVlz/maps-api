import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxConfig from '../config/mapboxConfig';

const MapboxAddressFormWorking = () => {
  const [debugInfo, setDebugInfo] = useState([]);
  const [searchStatus, setSearchStatus] = useState({ type: 'loading', message: 'Cargando...' });
  const hasInitialized = useRef(false);

  const addDebugInfo = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const debugMsg = `[${timestamp}] ${message}`;
    console.log(debugMsg);
    setDebugInfo(prev => [...prev, { message: debugMsg, type }]);
  }, []);

  const initializeWithSearchBox = useCallback(() => {
    try {
      addDebugInfo('🚀 Inicializando con MapboxSearchBox API...');
      
      if (!mapboxConfig.isValid()) {
        addDebugInfo('❌ Configuración de Mapbox inválida', 'error');
        setSearchStatus({ type: 'error', message: '❌ API Key inválida' });
        return;
      }
      
      const searchBox = new window.MapboxSearchBox();
      searchBox.accessToken = mapboxConfig.accessToken;
      
      const input = document.getElementById('address-input-working');
      if (input) {
        input.appendChild(searchBox);
        addDebugInfo('✅ SearchBox agregado al input');
        setSearchStatus({ type: 'success', message: '✅ Mapbox SearchBox activo' });
      }
    } catch (error) {
      addDebugInfo(`💥 Error con SearchBox: ${error.message}`);
      setSearchStatus({ type: 'error', message: 'Error con SearchBox' });
    }
  }, [addDebugInfo]);

  const initializeWithLegacyAPI = useCallback(() => {
    try {
      addDebugInfo('🚀 Inicializando con Legacy API...');
      
      if (!mapboxConfig.isValid()) {
        addDebugInfo('❌ Configuración de Mapbox inválida', 'error');
        setSearchStatus({ type: 'error', message: '❌ API Key inválida' });
        return;
      }
      
      const autofill = window.mapboxsearch.autofill({
        accessToken: mapboxConfig.accessToken
      });

      const shippingElement = document.getElementById('shipping-working');
      const billingElement = document.getElementById('billing-working');

      if (shippingElement) {
        autofill.attach(shippingElement);
        addDebugInfo('✅ Autofill attached to shipping');
      }

      if (billingElement) {
        autofill.attach(billingElement);
        addDebugInfo('✅ Autofill attached to billing');
      }

      setSearchStatus({ type: 'success', message: '✅ Mapbox Autofill activo' });
    } catch (error) {
      addDebugInfo(`💥 Error con Legacy API: ${error.message}`);
      setSearchStatus({ type: 'error', message: 'Error con Legacy API' });
    }
  }, [addDebugInfo]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    addDebugInfo('🔄 Iniciando carga de Mapbox Search API...');
    addDebugInfo(`🔑 Usando API Key: ${mapboxConfig.accessToken?.substring(0, 20)}...`);

    // Validar configuración primero
    if (!mapboxConfig.isValid()) {
      setSearchStatus({ type: 'error', message: '❌ Configuración inválida' });
      return;
    }

    // Cargar CSS Assembly desde configuración
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = mapboxConfig.assemblyCss;
    document.head.appendChild(cssLink);
    addDebugInfo('📄 CSS Assembly cargado desde configuración');

    // Usar la API desde configuración
    const script = document.createElement('script');
    script.src = mapboxConfig.getSearchScriptUrl('v1.0.0-beta.21');
    addDebugInfo(`🔗 Cargando script: ${script.src}`);
    
    script.onload = () => {
      addDebugInfo('📜 Script cargado, esperando inicialización...');
      
      // Esperar un poco más para que el objeto esté disponible
      setTimeout(() => {
        if (window.MapboxSearchBox) {
          addDebugInfo('✅ MapboxSearchBox encontrado!');
          initializeWithSearchBox();
        } else if (window.mapboxsearch) {
          addDebugInfo('✅ mapboxsearch encontrado!');
          initializeWithLegacyAPI();
        } else {
          addDebugInfo('❌ No se encontró ninguna API de Mapbox');
          setSearchStatus({ type: 'error', message: 'API no disponible' });
        }
      }, 500);
    };

    script.onerror = () => {
      addDebugInfo('💥 Error cargando script de Mapbox');
      setSearchStatus({ type: 'error', message: 'Error cargando script' });
    };

    document.head.appendChild(script);
  }, [addDebugInfo, initializeWithSearchBox, initializeWithLegacyAPI]);

  return (
    <div style={{ fontFamily: 'monospace' }}>
      <h3 style={{ color: '#dc2626', marginBottom: '16px' }}>
        🔥 Debug WORKING - Nueva API de Mapbox
      </h3>
      
      {/* Status */}
      <div style={{ 
        background: searchStatus.type === 'success' ? '#10b981' : 
                   searchStatus.type === 'error' ? '#ef4444' : '#f59e0b', 
        color: 'white',
        padding: '8px 12px', 
        borderRadius: '6px', 
        marginBottom: '16px',
        fontWeight: 'bold'
      }}>
        {searchStatus.message}
      </div>

      {/* Debug Info */}
      <div style={{ 
        background: '#1f2937', 
        color: '#10b981', 
        padding: '12px', 
        borderRadius: '8px', 
        marginBottom: '16px',
        maxHeight: '150px',
        overflowY: 'auto',
        fontSize: '12px'
      }}>
        {debugInfo.map((info, index) => (
          <div key={index} style={{ 
            color: info.type === 'error' ? '#ef4444' : 
                   info.type === 'success' ? '#10b981' : '#fbbf24' 
          }}>
            {info.message}
          </div>
        ))}
      </div>

      {/* SearchBox Container */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          🔍 Mapbox SearchBox (Nueva API)
        </label>
        <div 
          id="address-input-working"
          style={{ 
            minHeight: '40px', 
            border: '2px solid #e5e7eb', 
            borderRadius: '6px',
            padding: '8px'
          }}
        />
      </div>

      {/* Formularios Legacy */}
      <div className="grid grid--gut12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div id="shipping-working">
            <label className="txt-s txt-bold color-gray" style={{ display: 'block', marginBottom: '8px' }}>
              Shipping Address (Legacy API)
            </label>
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="Address Line 1"
              name="address_line1"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="Address Line 2" 
              name="address_line2"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="City" 
              name="locality"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="State/Province" 
              name="region"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="ZIP/Postal Code" 
              name="postcode"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="Country" 
              name="country"
            />
          </div>
        </div>

        <div>
          <div id="billing-working">
            <label className="txt-s txt-bold color-gray" style={{ display: 'block', marginBottom: '8px' }}>
              Billing Address (Legacy API)
            </label>
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="Address Line 1"
              name="address_line1"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="Address Line 2" 
              name="address_line2"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="City" 
              name="locality"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="State/Province" 
              name="region"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="ZIP/Postal Code" 
              name="postcode"
            />
            <input 
              className="input" 
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="Country" 
              name="country"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapboxAddressFormWorking;
