import { /*useState*/ } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import GooglePage from './pages/GooglePage'
import HerePage from './pages/HerePage'
import MapboxPage from './pages/MapboxPage'
import TestSimpleMapbox from './pages/TestSimpleMapbox'
import './App.css'

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
            <Route path="/google" element={<GooglePage />} />
            <Route path="/mapbox" element={<MapboxPage />} />
            <Route path="/test-simple" element={<TestSimpleMapbox />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
