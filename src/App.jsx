import { /*useState*/ } from 'react'
import { LoadScript } from '@react-google-maps/api'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import GooglePage from './pages/GooglePage'
import HerePage from './pages/HerePage'
import MapboxPage from './pages/MapboxPage'
import './App.css'

const libraries = ['places']

function App() {
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
      <Router>
        <div className="app">
          <header className="app-header">
            <h1>Formulario de Direcciones Rurales - Puerto Rico</h1>
            <nav style={{ marginTop: 8 }}>
              <Link to="/here" style={{ marginRight: 12 }}>Here (home)</Link>
              <Link to="/google" style={{ marginRight: 12 }}>Google</Link>
              <Link to="/mapbox">Mapbox</Link>
            </nav>
          </header>
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HerePage />} />
              <Route path="/here" element={<HerePage />} />
              <Route path="/google" element={<GooglePage />} />
              <Route path="/mapbox" element={<MapboxPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LoadScript>
  )
}

export default App
