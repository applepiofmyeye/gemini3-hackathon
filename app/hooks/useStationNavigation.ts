'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getWordsByLine } from '@/lib/data/vocabulary';
import type { VocabularyWord } from '@/lib/data/vocabulary';

/**
 * Hook to manage station navigation and progression.
 */
export function useStationNavigation() {
  const router = useRouter();

  /**
   * Get the next station in sequence for a given line.
   */
  const getNextStation = useMemo(() => {
    return (lineId: string, currentStationId: string): VocabularyWord | null => {
      const stations = getWordsByLine(lineId);
      const currentIndex = stations.findIndex((s) => s.id === currentStationId);
      
      if (currentIndex === -1 || currentIndex === stations.length - 1) {
        return null; // No next station
      }
      
      return stations[currentIndex + 1];
    };
  }, []);

  /**
   * Navigate to the next station or results page.
   */
  const goToNext = (lineId: string, currentStationId: string) => {
    const nextStation = getNextStation(lineId, currentStationId);
    
    if (nextStation) {
      router.push(`/${lineId}/${nextStation.id}`);
    } else {
      // Navigate to results page
      router.push(`/${lineId}/results`);
    }
  };

  /**
   * Navigate to a specific station.
   */
  const goToStation = (lineId: string, stationId: string) => {
    router.push(`/${lineId}/${stationId}`);
  };

  /**
   * Navigate to results page.
   */
  const goToResults = (lineId: string) => {
    router.push(`/${lineId}/results`);
  };

  /**
   * Navigate to home page.
   */
  const goToHome = () => {
    router.push('/');
  };

  return {
    getNextStation,
    goToNext,
    goToStation,
    goToResults,
    goToHome,
  };
}
