import type { RegionProfile } from './types';

export const REGIONS: RegionProfile[] = [
  // ─── ZONA NORTE ───────────────────────────────────────────────────────────
  {
    id: 'arica-parinacota',
    name: 'Región de Arica y Parinacota',
    zone: 'Norte',
    monthlyProductionKWhPerKWp: {
      1: 205, 2: 185, 3: 175, 4: 155, 5: 130, 6: 115,
      7: 120, 8: 140, 9: 160, 10: 185, 11: 200, 12: 210,
    },
    annualProductionKWhPerKWp: 1980,
    summer: { sunriseHour: 6.0, sunsetHour: 20.0 },
    winter: { sunriseHour: 7.0, sunsetHour: 19.0 },
  },
  {
    id: 'tarapaca',
    name: 'Región de Tarapacá',
    zone: 'Norte',
    monthlyProductionKWhPerKWp: {
      1: 200, 2: 180, 3: 170, 4: 150, 5: 125, 6: 110,
      7: 115, 8: 135, 9: 155, 10: 180, 11: 195, 12: 205,
    },
    annualProductionKWhPerKWp: 1920,
    summer: { sunriseHour: 6.0, sunsetHour: 20.0 },
    winter: { sunriseHour: 7.0, sunsetHour: 19.0 },
  },
  {
    id: 'antofagasta',
    name: 'Región de Antofagasta',
    zone: 'Norte',
    monthlyProductionKWhPerKWp: {
      1: 215, 2: 195, 3: 185, 4: 165, 5: 140, 6: 120,
      7: 125, 8: 150, 9: 170, 10: 195, 11: 210, 12: 220,
    },
    annualProductionKWhPerKWp: 2090,
    summer: { sunriseHour: 6.5, sunsetHour: 20.0 },
    winter: { sunriseHour: 7.0, sunsetHour: 18.5 },
  },
  {
    id: 'atacama',
    name: 'Región de Atacama',
    zone: 'Norte',
    monthlyProductionKWhPerKWp: {
      1: 210, 2: 190, 3: 180, 4: 160, 5: 135, 6: 115,
      7: 120, 8: 145, 9: 165, 10: 190, 11: 205, 12: 215,
    },
    annualProductionKWhPerKWp: 2030,
    summer: { sunriseHour: 6.5, sunsetHour: 20.5 },
    winter: { sunriseHour: 7.5, sunsetHour: 18.5 },
  },
  {
    id: 'coquimbo',
    name: 'Región de Coquimbo',
    zone: 'Norte',
    monthlyProductionKWhPerKWp: {
      1: 190, 2: 170, 3: 160, 4: 135, 5: 110, 6: 90,
      7: 95, 8: 120, 9: 140, 10: 165, 11: 180, 12: 195,
    },
    annualProductionKWhPerKWp: 1750,
    summer: { sunriseHour: 6.5, sunsetHour: 21.0 },
    winter: { sunriseHour: 7.5, sunsetHour: 18.0 },
  },

  // ─── ZONA CENTRAL ─────────────────────────────────────────────────────────
  {
    id: 'valparaiso',
    name: 'Región de Valparaíso',
    zone: 'Central',
    monthlyProductionKWhPerKWp: {
      1: 175, 2: 158, 3: 145, 4: 118, 5: 92, 6: 76,
      7: 80, 8: 105, 9: 128, 10: 153, 11: 168, 12: 178,
    },
    annualProductionKWhPerKWp: 1576,
    summer: { sunriseHour: 6.5, sunsetHour: 21.0 },
    winter: { sunriseHour: 7.5, sunsetHour: 18.0 },
  },
  {
    id: 'metropolitana',
    name: 'Región Metropolitana de Santiago',
    zone: 'Central',
    monthlyProductionKWhPerKWp: {
      1: 170, 2: 155, 3: 140, 4: 115, 5: 90, 6: 75,
      7: 79, 8: 100, 9: 123, 10: 148, 11: 163, 12: 172,
    },
    annualProductionKWhPerKWp: 1530,
    summer: { sunriseHour: 6.5, sunsetHour: 20.5 },
    winter: { sunriseHour: 7.5, sunsetHour: 18.5 },
  },
  {
    id: 'ohiggins',
    name: "Región del Libertador General Bernardo O'Higgins",
    zone: 'Central',
    monthlyProductionKWhPerKWp: {
      1: 168, 2: 152, 3: 138, 4: 112, 5: 87, 6: 72,
      7: 76, 8: 98, 9: 120, 10: 145, 11: 160, 12: 170,
    },
    annualProductionKWhPerKWp: 1498,
    summer: { sunriseHour: 6.5, sunsetHour: 20.5 },
    winter: { sunriseHour: 7.5, sunsetHour: 18.5 },
  },
  {
    id: 'maule',
    name: 'Región del Maule',
    zone: 'Central',
    monthlyProductionKWhPerKWp: {
      1: 163, 2: 148, 3: 133, 4: 107, 5: 82, 6: 67,
      7: 71, 8: 93, 9: 115, 10: 140, 11: 155, 12: 165,
    },
    annualProductionKWhPerKWp: 1439,
    summer: { sunriseHour: 6.5, sunsetHour: 21.0 },
    winter: { sunriseHour: 8.0, sunsetHour: 18.0 },
  },
  {
    id: 'nuble',
    name: 'Región de Ñuble',
    zone: 'Central',
    monthlyProductionKWhPerKWp: {
      1: 158, 2: 143, 3: 128, 4: 102, 5: 77, 6: 62,
      7: 66, 8: 88, 9: 110, 10: 135, 11: 150, 12: 160,
    },
    annualProductionKWhPerKWp: 1379,
    summer: { sunriseHour: 6.5, sunsetHour: 21.0 },
    winter: { sunriseHour: 8.0, sunsetHour: 18.0 },
  },
  {
    id: 'biobio',
    name: 'Región del Biobío',
    zone: 'Central',
    monthlyProductionKWhPerKWp: {
      1: 155, 2: 140, 3: 125, 4: 99, 5: 74, 6: 59,
      7: 63, 8: 85, 9: 107, 10: 132, 11: 147, 12: 157,
    },
    annualProductionKWhPerKWp: 1343,
    summer: { sunriseHour: 6.5, sunsetHour: 21.0 },
    winter: { sunriseHour: 8.0, sunsetHour: 18.0 },
  },

  // ─── ZONA SUR ─────────────────────────────────────────────────────────────
  {
    id: 'araucania',
    name: 'Región de La Araucanía',
    zone: 'Sur',
    monthlyProductionKWhPerKWp: {
      1: 148, 2: 133, 3: 118, 4: 92, 5: 67, 6: 52,
      7: 56, 8: 78, 9: 100, 10: 125, 11: 140, 12: 150,
    },
    annualProductionKWhPerKWp: 1259,
    summer: { sunriseHour: 6.5, sunsetHour: 21.5 },
    winter: { sunriseHour: 8.0, sunsetHour: 17.5 },
  },
  {
    id: 'los-rios',
    name: 'Región de Los Ríos',
    zone: 'Sur',
    monthlyProductionKWhPerKWp: {
      1: 140, 2: 125, 3: 110, 4: 84, 5: 59, 6: 44,
      7: 48, 8: 70, 9: 92, 10: 117, 11: 132, 12: 142,
    },
    annualProductionKWhPerKWp: 1163,
    summer: { sunriseHour: 6.5, sunsetHour: 21.5 },
    winter: { sunriseHour: 8.5, sunsetHour: 17.5 },
  },
  {
    id: 'los-lagos',
    name: 'Región de Los Lagos',
    zone: 'Sur',
    monthlyProductionKWhPerKWp: {
      1: 132, 2: 117, 3: 102, 4: 76, 5: 51, 6: 36,
      7: 40, 8: 62, 9: 84, 10: 109, 11: 124, 12: 134,
    },
    annualProductionKWhPerKWp: 1067,
    summer: { sunriseHour: 6.0, sunsetHour: 22.0 },
    winter: { sunriseHour: 8.5, sunsetHour: 17.0 },
  },

  // ─── ZONA AUSTRAL ─────────────────────────────────────────────────────────
  {
    id: 'aysen',
    name: 'Región de Aysén del General Carlos Ibáñez del Campo',
    zone: 'Austral',
    monthlyProductionKWhPerKWp: {
      1: 120, 2: 105, 3: 90, 4: 64, 5: 39, 6: 24,
      7: 28, 8: 50, 9: 72, 10: 97, 11: 112, 12: 122,
    },
    annualProductionKWhPerKWp: 923,
    summer: { sunriseHour: 5.5, sunsetHour: 22.5 },
    winter: { sunriseHour: 9.0, sunsetHour: 16.5 },
  },
  {
    id: 'magallanes',
    name: 'Región de Magallanes y de la Antártica Chilena',
    zone: 'Austral',
    monthlyProductionKWhPerKWp: {
      1: 105, 2: 90, 3: 75, 4: 49, 5: 24, 6: 10,
      7: 14, 8: 35, 9: 57, 10: 82, 11: 97, 12: 107,
    },
    annualProductionKWhPerKWp: 745,
    summer: { sunriseHour: 5.0, sunsetHour: 23.0 },
    winter: { sunriseHour: 9.5, sunsetHour: 16.0 },
  },
];

export function getRegionById(id: string): RegionProfile | undefined {
  return REGIONS.find((r) => r.id === id);
}
