'use client';

import Image from 'next/image';

/**
 * SkylinePageLayout - Reusable full-screen layout with Singapore skyline background.
 *
 * Provides the consistent cream background with the Singapore skyline image
 * at the bottom, creating a unified visual identity across screens.
 */

interface SkylinePageLayoutProps {
  /** Content to render on top of the skyline background */
  children: React.ReactNode;
  /** Whether to show the semi-transparent overlay (default: true) */
  showOverlay?: boolean;
  /** Custom overlay opacity (default: 0.8) */
  overlayOpacity?: number;
  /** Additional CSS classes for the container */
  className?: string;
}

export default function SkylinePageLayout({
  children,
  showOverlay = true,
  overlayOpacity = 0.8,
  className = '',
}: SkylinePageLayoutProps) {
  return (
    <div className={`fixed inset-0 flex flex-col min-h-screen bg-(--hot-cream) ${className}`}>
      {/* Singapore Skyline Background */}
      <div className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none">
        <Image
          src="/singapore-skyline.png"
          alt="Singapore Skyline"
          width={1507}
          height={560}
          sizes="100vw"
          className="w-full h-auto"
          priority
        />
      </div>

      {/* Semi-transparent Overlay */}
      {showOverlay && (
        <div
          className="absolute inset-0 backdrop-blur-sm z-10 pointer-events-none"
          style={{ backgroundColor: `rgba(253, 251, 247, ${overlayOpacity})` }}
        />
      )}

      {/* Content Container */}
      <div className="relative z-20 flex-1 flex flex-col overflow-auto">{children}</div>
    </div>
  );
}
