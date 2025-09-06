import React, { useState } from 'react'
import { AddressAutofill } from '@mapbox/search-js-react'

const TestMapboxSimpler = () => {
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleSuggestionClick = (suggestion) => {
    console.log('CUSTOM SUGGESTION CLICKED:', suggestion)
    setAddress(suggestion.name || suggestion.feature_name || 'Suggestion selected')
    setSuggestions([])
    setShowSuggestions(false)
    alert('Suggestion selected: ' + JSON.stringify(suggestion, null, 2))
  }

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      <h2>Test Mapbox - Custom Suggestions</h2>
      
      {/* CSS para ocultar elementos nativos de Mapbox */}
      <style>
        {`
          /* Ocultar TODOS los elementos nativos de Mapbox */
          [class*="mbx"],
          [class*="--Results"],
          [class*="--ResultsList"], 
          [class*="--Suggestion"],
          [data-search-js-autofill] > div:not(input) {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Mantener solo el input visible */
          [data-search-js-autofill] input {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        `}
      </style>
      
      <div style={{ position: 'relative' }}>
        <AddressAutofill 
          accessToken={import.meta.env.VITE_MAPBOX_API_KEY}
          options={{
            country: 'US',
            bbox: [-67.945, 17.88, -65.22, 18.515] // Puerto Rico
          }}
          onSuggest={(result) => {
            console.log('🔍 SUGGESTIONS RECEIVED:', result)
            if (result && result.suggestions) {
              setSuggestions(result.suggestions)
              setShowSuggestions(true)
            }
          }}
          onRetrieve={(suggestion) => {
            console.log('MAPBOX RETRIEVE:', suggestion)
            // Este también debería funcionar
            alert('Mapbox retrieve: ' + JSON.stringify(suggestion, null, 2))
          }}
        >
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value)
              if (!e.target.value.trim()) {
                setSuggestions([])
                setShowSuggestions(false)
              }
            }}
            placeholder="Escribe una dirección en Puerto Rico..."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </AddressAutofill>

        {/* NUESTROS PROPIOS ELEMENTOS DE SUGERENCIA */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '2px solid red',
            borderRadius: '0 0 4px 4px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '12px',
                  background: 'yellow',
                  cursor: 'pointer',
                  borderBottom: '1px solid orange',
                  color: 'black'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'orange'
                  e.target.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'yellow'
                  e.target.style.color = 'black'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>
                  {suggestion.name || suggestion.feature_name || 'Sin nombre'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {suggestion.full_address || suggestion.place_formatted || 'Sin dirección'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TestMapboxSimpler
