/**
 * Singapore MRT Lines data.
 * Used for game theming and vocabulary organization.
 */

export interface MRTLine {
  id: string;
  name: string;
  abbreviation: string; // Line abbreviation (e.g., "EWL", "NSL")
  color: string; // Hex color
  bgGradient: string; // Tailwind gradient classes
  description: string;
  stations: string[]; // Sample stations (for flavor)
}

export const MRT_LINES: MRTLine[] = [
  {
    id: 'north-south',
    name: 'North-South Line',
    abbreviation: 'NSL',
    color: '#D42E12',
    bgGradient: 'from-red-600 to-red-500',
    description: 'From Marina Bay to Jurong East',
    stations: ['Marina Bay', 'Orchard', 'Yishun', 'Jurong East'],
  },
  {
    id: 'east-west',
    name: 'East-West Line',
    abbreviation: 'EWL',
    color: '#009645',
    bgGradient: 'from-green-600 to-green-500',
    description: 'From Pasir Ris to Tuas Link',
    stations: ['Pasir Ris', 'Tampines', 'Bugis', 'Jurong East'],
  },
  {
    id: 'north-east',
    name: 'North-East Line',
    abbreviation: 'NEL',
    color: '#9900AA',
    bgGradient: 'from-purple-600 to-purple-500',
    description: 'From HarbourFront to Punggol',
    stations: ['HarbourFront', 'Chinatown', 'Serangoon', 'Punggol'],
  },
  {
    id: 'circle',
    name: 'Circle Line',
    abbreviation: 'CCL',
    color: '#FA9E0D',
    bgGradient: 'from-orange-500 to-yellow-500',
    description: 'The orbital line connecting all radials',
    stations: ['Dhoby Ghaut', 'Botanic Gardens', 'Marina Bay'],
  },
  {
    id: 'downtown',
    name: 'Downtown Line',
    abbreviation: 'DTL',
    color: '#005EC4',
    bgGradient: 'from-blue-600 to-blue-500',
    description: 'From Bukit Panjang to Expo',
    stations: ['Bukit Panjang', 'Little India', 'Bayfront', 'Expo'],
  },
  {
    id: 'tel',
    name: 'Thomson-East Coast Line',
    abbreviation: 'TEL',
    color: '#8B4513',
    bgGradient: 'from-brown-600 to-brown-500',
    description: 'From Tuas Link to Bright Hill',
    stations: ['Tuas Link', 'Bright Hill'],
  },
];

/**
 * Get MRT line by ID.
 */
export function getMRTLineById(id: string): MRTLine | undefined {
  return MRT_LINES.find((line) => line.id === id);
}
