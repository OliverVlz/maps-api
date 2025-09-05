// Configuración centralizada para las APIs de Mapbox
export const mapboxConfig = {
  // API Key principal
  accessToken: import.meta.env.VITE_MAPBOX_API_KEY,
  
  // URLs base
  searchApiBase: import.meta.env.VITE_MAPBOX_SEARCH_API_BASE || 'https://api.mapbox.com/search-js',
  geocodingApiBase: import.meta.env.VITE_MAPBOX_GEOCODING_API_BASE || 'https://api.mapbox.com/geocoding/v5/mapbox.places',
  assemblyCss: import.meta.env.VITE_MAPBOX_ASSEMBLY_CSS || 'https://api.mapbox.com/mapbox-assembly/v1.3.0/assembly.min.css',
  
  // Versiones de la API Search a probar
  searchVersions: import.meta.env.VITE_MAPBOX_SEARCH_VERSIONS?.split(',') || ['v1.0.0', 'v1.0.0-beta.21', 'v1.3.0'],
  
  // CDNs alternativos
  cdnUrls: [
    import.meta.env.VITE_MAPBOX_CDN_UNPKG || 'https://unpkg.com/@mapbox/search-js-web@1.0.0',
    import.meta.env.VITE_MAPBOX_CDN_JSDELIVR || 'https://cdn.jsdelivr.net/npm/@mapbox/search-js-web@1.0.0'
  ],
  
  // Funciones de ayuda
  getSearchScriptUrl(version) {
    return `${this.searchApiBase}/${version}/web.js`;
  },
  
  // Alias para compatibilidad
  getSearchJSUrl(version = 'v1.0.0-beta.21') {
    return this.getSearchScriptUrl(version);
  },
  
  // URL para Assembly CSS
  get assemblyCSSUrl() {
    return this.assemblyCss;
  },
  
  getGeocodingUrl(query, options = {}) {
    const params = new URLSearchParams({
      access_token: this.accessToken,
      limit: options.limit || 5,
      autocomplete: options.autocomplete !== false ? 'true' : 'false',
      ...options
    });
    
    return `${this.geocodingApiBase}/${encodeURIComponent(query)}.json?${params}`;
  },
  
  getAllScriptUrls() {
    const urls = [];
    
    // URLs de versiones oficiales
    this.searchVersions.forEach(version => {
      urls.push(this.getSearchScriptUrl(version));
    });
    
    // URLs de CDNs alternativos
    urls.push(...this.cdnUrls);
    
    return urls;
  },
  
  // Validar configuración
  isValid() {
    if (!this.accessToken) {
      console.error('❌ VITE_MAPBOX_API_KEY no está configurado en .env');
      return false;
    }
    
    if (!this.accessToken.startsWith('pk.')) {
      console.error('❌ VITE_MAPBOX_API_KEY no parece ser válido (debe empezar con "pk.")');
      return false;
    }
    
    return true;
  }
};

export default mapboxConfig;
