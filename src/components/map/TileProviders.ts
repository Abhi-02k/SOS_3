export interface TileProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  subdomains: string | string[];
  maxZoom: number;
}

export const TILE_PROVIDERS: Record<string, TileProvider> = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap (Public)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  dark: {
    id: 'dark',
    name: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  satellite: {
    id: 'satellite',
    name: 'Esri World Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &copy; Earthstar Geographics',
    subdomains: 'abc',
    maxZoom: 18,
  },
};
