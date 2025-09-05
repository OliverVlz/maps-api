import { /*useState*/ } from 'react'
import { LoadScript } from '@react-google-maps/api'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import GooglePage from './pages/GooglePage'
import HerePage from './pages/HerePage'
import MapboxPage from './pages/MapboxPage'
import TestSimpleMapbox from './pages/TestSimpleMapbox'
import './App.css'

const libraries = ['places']

// Componente wrapper para las páginas que necesitan Google Maps
function GoogleMapsWrapper({ children }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="error-container">
        <h2>Error de Configuración</h2>
        <p>Por favor configura tu API key de Google Maps en el archivo .env:</p>
        <code>VITE_GOOGLE_MAPS_API_KEY=tu_api_key</code>
      </div>
    )
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      {children}
    </LoadScript>
  )
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="app">
        <header className="app-header">
          <nav style={{ marginTop: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Link to="/here" style={{ marginRight: 12 }}>Here (home)</Link>
            <Link to="/google" style={{ marginRight: 12 }}>Google</Link>
            <Link to="/mapbox" style={{ marginRight: 12 }}>Mapbox</Link>
            <Link to="/test-simple" style={{ marginRight: 12 }}>🧪 Test Simple</Link>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HerePage />} />
            <Route path="/here" element={<HerePage />} />
            <Route path="/google" element={<GoogleMapsWrapper><GooglePage /></GoogleMapsWrapper>} />
            <Route path="/mapbox" element={<MapboxPage />} />
            <Route path="/test-simple" element={<TestSimpleMapbox />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
