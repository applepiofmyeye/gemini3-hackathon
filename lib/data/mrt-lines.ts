/**
 * Singapore MRT Lines data.
 * Used for game theming and vocabulary organization.
 */

export interface MRTLine {
  id: string;
  name: string;
  color: string; // Hex color
  bgGradient: string; // Tailwind gradient classes
  description: string;
  stations: string[]; // Sample stations (for flavor)
}

export const MRT_LINES: MRTLine[] = [
  {
    id: 'north-south',
    name: 'North-South Line',
    color: '#D42E12',
    bgGradient: 'from-red-600 to-red-500',
    description: 'From Marina Bay to Jurong East',
    stations: ['Marina Bay', 'Orchard', 'Yishun', 'Jurong East'],
  },
  {
    id: 'east-west',
    name: 'East-West Line',
    color: '#009645',
    bgGradient: 'from-green-600 to-green-500',
    description: 'From Pasir Ris to Tuas Link',
    stations: ['Pasir Ris', 'Tampines', 'Bugis', 'Jurong East'],
  },
  {
    id: 'north-east',
    name: 'North-East Line',
    color: '#9900AA',
    bgGradient: 'from-purple-600 to-purple-500',
    description: 'From HarbourFront to Punggol',
    stations: ['HarbourFront', 'Chinatown', 'Serangoon', 'Punggol'],
  },
  {
    id: 'circle',
    name: 'Circle Line',
    color: '#FA9E0D',
    bgGradient: 'from-orange-500 to-yellow-500',
    description: 'The orbital line connecting all radials',
    stations: ['Dhoby Ghaut', 'Botanic Gardens', 'Marina Bay'],
  },
  {
    id: 'downtown',
    name: 'Downtown Line',
    color: '#005EC4',
    bgGradient: 'from-blue-600 to-blue-500',
    description: 'From Bukit Panjang to Expo',
    stations: ['Bukit Panjang', 'Little India', 'Bayfront', 'Expo'],
  },
];

/**
 * Get MRT line by ID.
 */
export function getMRTLineById(id: string): MRTLine | undefined {
  return MRT_LINES.find((line) => line.id === id);
}
