import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import process from "process";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint para validar direcciones con Google Address Validation API
app.post("/api/validate-address", async (req, res) => {
  try {
    const { addressLines, regionCode = "PR" } = req.body;
    
    // Validar que se proporcionen las líneas de dirección
    if (!addressLines || !Array.isArray(addressLines) || addressLines.length === 0) {
      return res.status(400).json({ 
        error: "Se requieren addressLines como array no vacío" 
      });
    }

    // Usar la clave del servidor (debe estar restringida por IP, no por referrer)
    const apiKey = process.env.GOOGLE_SERVER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GOOGLE_SERVER_API_KEY no configurada en el servidor" 
      });
    }

    const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;

    const body = {
      address: { 
        addressLines: addressLines.filter(line => line && line.trim() !== ''),
        regionCode 
      },
      enableUspsCass: true, // PR está bajo USPS (útil para normalización)
      previousResponseId: undefined // Para seguimiento de sesiones si es necesario
    };

    console.log('🔍 Validating address:', body);

    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Address Validation API error:', data);
      return res.status(response.status).json({
        error: `Address Validation API error: ${response.status}`,
        details: data
      });
    }

    console.log('✅ Address validation successful');
    return res.status(200).json(data);

  } catch (err) {
    console.error('❌ Server error in address validation:', err);
    res.status(500).json({ 
      error: "Error interno del servidor", 
      details: String(err) 
    });
  }
});

// Endpoint de salud
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "Address Validation Proxy"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Address Validation Proxy Server running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📮 Validation endpoint: http://localhost:${PORT}/api/validate-address`);
});
