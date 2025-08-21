# Ejemplos de Direcciones Rurales de Puerto Rico

## 🛣️ **Direcciones Rurales con Carreteras y KM**

### **Carreteras Estatales (PR)**

```
PR-123 KM 15.2, Ciales
PR-156 KM 32.1, Comerío
PR-152 KM 18.5, Barranquitas
PR-191 KM 13.7, Adjuntas
PR-143 KM 25.8, Barranquitas
PR-511 KM 2.3, Cayey
PR-162 KM 8.9, Aguas Buenas
PR-172 KM 14.2, Cidra
```

### **Carreteras Municipales**

```
Carr 123 KM 15.2, Bo. Naranjo, Comerío
Carretera 156 KM 8.5, Bo. Pueblo, Orocovis
Carr 718 KM 3.2, Bo. Tejas, Las Piedras
Carretera 825 KM 12.1, Bo. Mamey, Guaynabo
Carr 402 KM 6.7, Bo. Sumidero, Aguas Buenas
```

## 🏔️ **Zonas Montañosas**

### **Cordillera Central**

```
KM 41.2 Carr 143, Bo. Helechal, Barranquitas
Carretera 162 KM 18.5, Bo. Juan Asencio, Aguas Buenas
PR-152 KM 22.8, Bo. Farallón, Cidra
Carr 156 KM 28.3, Bo. Damián Arriba, Comerío
KM 15.7 PR-511, Bo. Jájome Alto, Cayey
```

### **Sector Utuado-Adjuntas**

```
PR-123 KM 45.2, Bo. Angeles, Utuado
Carretera 518 KM 8.9, Bo. Tanama, Utuado
PR-143 KM 35.1, Bo. Guilarte, Adjuntas
Carr 525 KM 4.5, Bo. Yahuecas, Adjuntas
```

## 🌊 **Zonas Costeras Rurales**

### **Costa Norte**

```
Carr 681 KM 2.1, Bo. Espíritu Santo, Río Grande
PR-966 KM 5.8, Bo. Palmer, Río Grande
Carretera 956 KM 1.2, Bo. Mameyes, Ceiba
```

### **Costa Sur**

```
PR-3 KM 138.5, Bo. Jagual, Guayama
Carr 714 KM 7.3, Bo. Machete, Guayama
Carretera 901 KM 3.8, Bo. Jobos, Guayama
```

## 🏞️ **Zonas Específicas por Municipio**

### **Caguas (Rural)**

```
Carr 1 KM 35.2, Bo. Cañaboncito
PR-172 KM 12.8, Bo. Tomás de Castro
Carretera 763 KM 4.1, Bo. Beatriz
```

### **Cayey**

```
PR-14 KM 45.7, Bo. Jájome Bajo
Carr 715 KM 8.2, Bo. Cedro
Carretera 738 KM 2.9, Bo. Montellano
```

### **Comerío**

```
PR-156 KM 32.1, Bo. Naranjo
Carr 167 KM 6.4, Bo. Río Hondo
Carretera 776 KM 1.8, Bo. Pueblo
```

### **Cidra**

```
PR-172 KM 16.3, Bo. Arenas
Carr 787 KM 5.1, Bo. Beatriz
Carretera 173 KM 9.7, Bo. Sud Este
```

## 📍 **Ejemplos con Puntos de Referencia**

### **Con Establecimientos**

```
KM 15.2 Carr 156, cerca Escuela Rural Naranjo, Comerío
PR-143 KM 25.8, frente Iglesia San José, Barranquitas
Carr 123 KM 12.1, al lado Colmado Rodríguez, Ciales
```

### **Con Sectores Específicos**

```
Carr 156 KM 8.5, Sector La Vega, Bo. Pueblo, Orocovis
PR-152 KM 18.5, Sector Los Llanos, Bo. Farallón, Cidra
Carretera 511 KM 2.3, Sector Alturas, Bo. Jájome, Cayey
```

## 🧪 **Para Probar Funcionalidades Específicas**

### **Direcciones que deberían encontrarse fácilmente:**

```
Escuela José de Diego, Cayey
Plaza de Armas, Caguas
Centro de Salud, Comerío
Iglesia San José, Cidra
```

### **Direcciones rurales desafiantes:**

```
KM 45.8 PR-143, Bo. Guilarte, Adjuntas
Carr 402 KM 15.2, Sector Monte Grande, Aguas Buenas
Carretera 718 KM 8.9, Bo. Tejas Arriba, Las Piedras
```

### **Para probar geocodificación inversa (coordenadas):**

```
18.238889, -66.150000  (Caguas rural)
18.180000, -66.330000  (Cayey montañoso)
18.255000, -66.225000  (Comerío rural)
18.195000, -66.180000  (Cidra)
```

## 💡 **Tips para las Pruebas**

### **1. Usa variaciones de formato:**

- `KM 15.2 Carr 156`
- `Carretera 156 KM 15.2`
- `PR-156 kilómetro 15.2`

### **2. Prueba con y sin barrio:**

- `Carr 123, Ciales` (sin barrio)
- `Carr 123, Bo. Pueblo, Ciales` (con barrio)

### **3. Incluye puntos de referencia:**

- `cerca de la escuela`
- `frente a la iglesia`
- `al lado del colmado`

## 🔧 **Casos de Prueba Específicos**

### **Test Case 1: Búsqueda Exitosa con Sugerencia**

```
Input: "Escuela José de Diego Cayey"
Expected: Aparecen sugerencias → Usuario selecciona una → Ubicación confirmada
```

### **Test Case 2: Búsqueda Manual Exitosa**

```
Input Manual:
- Línea 1: "Carr 156 KM 8.5"
- Municipio: "Comerío"
- Barrio: "Naranjo"

Expected: Sistema geocodifica correctamente
```

### **Test Case 3: Búsqueda Manual con Ubicaciones Cercanas**

```
Input Manual:
- Línea 1: "Calle Inexistente 123"
- Municipio: "Caguas"
- Barrio: "Pueblo"

Expected: Sistema muestra ubicaciones cercanas en Caguas
```

### **Test Case 4: Coordenadas Directas**

```
Input: "18.238889, -66.150000"
Expected: Validación automática + información detallada de la ubicación
```

### **Test Case 5: Discrepancia de Datos**

```
Input Manual:
- Línea 1: "Plaza de Armas"
- Municipio: "Bayamón" (incorrecto)
- Barrio: "Centro"

Expected: Google encuentra "Caguas" → Advertencia de discrepancia
```

---

**Nota:** Estos ejemplos están diseñados para probar todas las funcionalidades implementadas en la aplicación de direcciones rurales de Puerto Rico, incluyendo búsqueda automática, geocodificación manual, manejo de errores y sugerencias de ubicaciones cercanas.
