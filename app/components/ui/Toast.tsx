'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type ToastVariant = 'default' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';

interface ToastProps {
  /** Content to render inside the toast */
  children: ReactNode;
  /** Visual variant */
  variant?: ToastVariant;
  /** Position on screen */
  position?: ToastPosition;
  /** Whether toast is visible (controls animation) */
  isVisible?: boolean;
  /** Callback when dismiss is triggered */
  onDismiss?: () => void;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Custom class for the toast container */
  className?: string;
  /** Aria role for accessibility */
  role?: 'alert' | 'status';
}

// ============================================================
// VARIANT STYLES
// ============================================================

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'bg-gray-800 border-gray-700 text-white',
  success: 'bg-green-600 border-green-700 text-white',
  warning: 'bg-amber-500 border-amber-600 text-black',
  error: 'bg-red-600 border-red-700 text-white',
};

// ============================================================
// POSITION STYLES
// ============================================================

const POSITION_STYLES: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4 sm:right-6',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4 sm:right-6',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

const ANIMATION_STYLES: Record<ToastPosition, { enter: string; exit: string }> = {
  'top-right': {
    enter: 'translate-x-0 opacity-100',
    exit: 'translate-x-8 opacity-0',
  },
  'top-center': {
    enter: 'translate-y-0 opacity-100',
    exit: '-translate-y-4 opacity-0',
  },
  'bottom-right': {
    enter: 'translate-x-0 opacity-100',
    exit: 'translate-x-8 opacity-0',
  },
  'bottom-center': {
    enter: 'translate-y-0 opacity-100',
    exit: 'translate-y-4 opacity-0',
  },
};

// ============================================================
// COMPONENT
// ============================================================

/**
 * Generic Toast component.
 *
 * A reusable, accessible toast notification that slides in from the edge
 * of the screen. Supports multiple variants and positions.
 *
 * @example
 * ```tsx
 * <Toast
 *   variant="success"
 *   position="top-right"
 *   isVisible={showToast}
 *   onDismiss={() => setShowToast(false)}
 * >
 *   <div className="flex items-center gap-2">
 *     <CheckCircle className="w-5 h-5" />
 *     <span>Operation successful!</span>
 *   </div>
 * </Toast>
 * ```
 */
export default function Toast({
  children,
  variant = 'default',
  position = 'top-right',
  isVisible = true,
  onDismiss,
  showCloseButton = true,
  className = '',
  role = 'status',
}: ToastProps) {
  // Don't render if not visible
  if (!isVisible) return null;

  const variantStyle = VARIANT_STYLES[variant];
  const positionStyle = POSITION_STYLES[position];
  // Always use enter animation since we only render when visible
  const animationStyle = ANIMATION_STYLES[position].enter;

  return (
    <div
      role={role}
      aria-live="polite"
      className={`
        fixed z-50 w-full max-w-sm
        ${positionStyle}
        ${variantStyle}
        border-2 rounded-xl shadow-2xl
        transform transition-all duration-300 ease-out
        ${animationStyle}
        ${className}
      `}
    >
      <div className="relative p-4">
        {/* Close button */}
        {showCloseButton && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Content */}
        <div className={showCloseButton ? 'pr-6' : ''}>{children}</div>
      </div>
    </div>
  );
}
