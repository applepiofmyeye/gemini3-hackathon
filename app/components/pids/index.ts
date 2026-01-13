/**
 * PIDS (Passenger Information Display System) Components
 *
 * PIDS refers to the electronic display boards found at train/MRT stations
 * that show real-time arrival information, platform numbers, and service alerts.
 * In Singapore MRT stations, these are the distinctive black LED/LCD screens
 * with line-colored accents (e.g., red for North-South Line).
 *
 * These components are styled to mimic authentic Singapore MRT PIDS aesthetics:
 * - Dark backgrounds with high contrast text
 * - Line-colored accents and status indicators
 * - Clean, readable typography
 * - Real-time status messaging style
 *
 * Can be composed together in PlatformArrivalScreen or used independently.
 */

export { default as StationHeader } from './StationHeader';
export { default as ArrivalStatus, type ArrivalScenario } from './ArrivalStatus';
export { default as ScoreBadge } from './ScoreBadge';
export { default as WordComparison } from './WordComparison';
export { default as FeedbackPanel } from './FeedbackPanel';
export { default as AnnouncementPlayer } from './AnnouncementPlayer';
