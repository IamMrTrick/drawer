'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './Drawer.css';

type DrawerSide = 'left' | 'right' | 'top' | 'bottom';
type DrawerSize = 's' | 'm' | 'l' | 'xl' | 'fullscreen';

export interface DrawerProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  side?: DrawerSide;
  size?: DrawerSize;
  dismissible?: boolean;
  swipeToClose?: boolean;
  backdrop?: boolean;
  trapFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  className?: string;
  backdropClassName?: string;
  panelClassName?: string;
  
  // 🔥 3-MODE SYSTEM - keeping the old interface
  /** Enable expand mode - allows dragging to full screen (top/bottom only) */
  expandMode?: boolean;
  /** Enable minimize mode - allows minimizing to header height (bottom only) */
  minimizeMode?: boolean;
  /** Called when drawer is minimized */
  onMinimize?: () => void;
  /** Called when drawer is restored from minimize */
  onRestore?: () => void;
  
  /** Bottom offset in pixels - useful for avoiding bottom navigation menus */
  bottomOffset?: number;
  
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  children: React.ReactNode;
}

const bem = (block: string, modifiers: Array<string | false | undefined>) => {
  const base = block;
  const mods = modifiers.filter(Boolean).map(m => `${base}--${m}`);
  return [base, ...mods].join(' ');
};

type FocusableRef = React.RefObject<HTMLElement> | React.MutableRefObject<HTMLElement>;

function useLockBodyScroll(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, [active]);
}

function useFocusTrap(containerRef: FocusableRef, active: boolean, initialFocusRef?: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current as HTMLElement | null;
    if (!container) return;

    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(selectors))
      .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1 && !el.hasAttribute('inert'));

    const focusables = getFocusable();
    const toFocus = initialFocusRef?.current || focusables[0] || container;
    toFocus?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const list = getFocusable();
      if (list.length === 0) {
        e.preventDefault();
        container?.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [containerRef, active, initialFocusRef]);
}

// ✅ LEFT/RIGHT DRAG - IMPROVED WITH SMOOTH SCALING
function useLeftRightDrag(
  panelRef: React.RefObject<HTMLElement>,
  side: 'left' | 'right',
  active: boolean,
  onClose: () => void
) {
  const [dragState, setDragState] = useState({
    isDragging: false,
    offset: 0,
    progress: 0,
    scale: 1,
    realTimeHeight: null as number | null,
    startTime: 0,
    lastY: 0,
    velocity: 0,
  });

  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    if (!panel) return;

    // Improved tracking with same logic as top/bottom
    const ref = {
      startX: 0,
      startY: 0,
      lastX: 0,
      startTime: 0,
      committed: false,
      velocities: [] as number[],
      target: null as HTMLElement | null,
      isInteractiveTarget: false,
    };

    const MOVEMENT_DEADZONE = 8;
    const INTERACTIVE_DEADZONE = 16;
    const CLOSE_THRESHOLD = 0.4;
    const VELOCITY_THRESHOLD = 0.5;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      
      ref.startX = e.clientX;
      ref.startY = e.clientY;
      ref.lastX = e.clientX;
      ref.startTime = Date.now();
      ref.committed = false;
      ref.velocities = [];
      ref.target = target;
      ref.isInteractiveTarget = !!(target.closest('button, a, [role="button"], input, select, textarea') || target.isContentEditable);
      
      setDragState(prev => ({ ...prev, isDragging: false }));
    }

    function onPointerMove(e: PointerEvent) {
      if (!ref.startX) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      const totalDeltaX = currentX - ref.startX;
      const totalDeltaY = currentY - ref.startY;
      const now = Date.now();
      
      // Calculate velocity
      const rawDelta = currentX - ref.lastX;
      const velocity = rawDelta / Math.max(1, now - ref.startTime);
      ref.velocities.push(velocity);
      if (ref.velocities.length > 6) ref.velocities.shift();
      ref.lastX = currentX;
      
      if (!ref.committed) {
        const moved = Math.abs(totalDeltaX);
        if (moved < MOVEMENT_DEADZONE) return;
        
        // Horizontal dominance check - less strict for better responsiveness
        const horizontalDominant = Math.abs(totalDeltaX) >= Math.abs(totalDeltaY) * 1.1;
        
        const canCommit = horizontalDominant && (!ref.isInteractiveTarget || moved >= INTERACTIVE_DEADZONE);
        
        if (!canCommit) {
          // Show scale effect for wrong direction when not committing
          const sign = side === 'left' ? -1 : 1;
          const wrongDirectionDelta = totalDeltaX * -sign; // Opposite of closing direction
          
          if (wrongDirectionDelta > 0 && moved > MOVEMENT_DEADZONE) {
            // Smooth, pressure-based scale effect
            const startDistance = 12;
            const maxDistance = 180;
            const maxScale = 0.04;
            
            const effectiveDistance = Math.max(0, wrongDirectionDelta - startDistance);
            const normalizedDistance = Math.min(effectiveDistance / (maxDistance - startDistance), 1);
            const smoothFactor = Math.pow(normalizedDistance, 2.1);
            const elasticScale = 1 + (smoothFactor * maxScale);
            
            setDragState(prev => ({ ...prev, isDragging: true, scale: elasticScale, offset: 0, progress: 0 }));
          } else {
            setDragState(prev => ({ ...prev, scale: 1, isDragging: false }));
          }
          return;
        }
        
        ref.committed = true;
        try {
          panel.setPointerCapture(e.pointerId);
        } catch {}
      }
      
      if (ref.committed) {
        updateDragVisuals(totalDeltaX);
        e.preventDefault();
        e.stopPropagation();
      }
    }

    function updateDragVisuals(totalDelta: number) {
      const width = panel.getBoundingClientRect().width;
      const sign = side === 'left' ? -1 : 1; // left: negative closes, right: positive closes
      const closingDelta = totalDelta * sign;
      
      let offset = 0;
      let progress = 0;
      let scale = 1;
      
      if (closingDelta >= 0) {
        // CLOSING direction - smooth offset
        offset = Math.min(closingDelta, width);
        progress = offset / width;
      } else {
        // WRONG direction - show scale effect (like trying to open more)
        const openingAmount = Math.abs(closingDelta);
        
        // Smooth scale effect for wrong direction
        const startDistance = 15;
        const maxDistance = 200;
        const maxScale = 0.05;
        
        const effectiveDistance = Math.max(0, openingAmount - startDistance);
        const normalizedDistance = Math.min(effectiveDistance / (maxDistance - startDistance), 1);
        const smoothFactor = Math.pow(normalizedDistance, 2.0);
        scale = 1 + (smoothFactor * maxScale);
      }
      
      setDragState({
        isDragging: true,
        offset,
        progress,
        scale,
        realTimeHeight: null,
        startTime: ref.startTime,
        lastY: 0,
        velocity: ref.velocities.length > 0 ? ref.velocities[ref.velocities.length - 1] : 0
      });
    }

    function onPointerUp(e: PointerEvent) {
      try {
        if (panel.hasPointerCapture?.(e.pointerId)) {
          panel.releasePointerCapture(e.pointerId);
        }
      } catch {}

      // Always reset drag state on pointer up, regardless of committed state
      const wasCommitted = ref.committed;
      
      if (wasCommitted) {
        const totalDelta = e.clientX - ref.startX;
        const sign = side === 'left' ? -1 : 1;
        const closingDelta = totalDelta * sign;
        const width = panel.getBoundingClientRect().width;
        
        // Only close in the CORRECT direction
        if (closingDelta >= 0) {
          const progress = closingDelta / width;
          
          // Calculate average velocity in closing direction
          const avgVelocity = ref.velocities.length > 0 ? 
            ref.velocities.reduce((sum, v) => sum + v, 0) / ref.velocities.length : 0;
          
          // Check for swipe in closing direction
          const isSwipeClosing = avgVelocity * sign > VELOCITY_THRESHOLD;
          
          if (isSwipeClosing || progress >= CLOSE_THRESHOLD) {
            onClose();
            return; // Don't reset if closing
          }
        }
        // If wrong direction or not enough progress, just reset (don't close)
      }

      resetDragState();
    }

    function resetDragState() {
      setDragState({ isDragging: false, offset: 0, progress: 0, scale: 1, realTimeHeight: null, startTime: 0, lastY: 0, velocity: 0 });
      ref.startX = 0;
      ref.startY = 0;
      ref.lastX = 0;
      ref.startTime = 0;
      ref.committed = false;
      ref.velocities = [];
      ref.target = null;
      ref.isInteractiveTarget = false;
    }

    // Touch handlers
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const fakePointerEvent = {
        target: e.target,
        clientX: touch.clientX,
        clientY: touch.clientY,
        pointerId: -1
      } as PointerEvent;
      onPointerDown(fakePointerEvent);
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const fakePointerEvent = {
        target: e.target,
        clientX: touch.clientX,
        clientY: touch.clientY,
        pointerId: -1,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation()
      } as PointerEvent;
      onPointerMove(fakePointerEvent);
    }

    function onTouchEnd(e: TouchEvent) {
      const changedTouch = e.changedTouches[0];
      if (!changedTouch) return;
      const fakePointerEvent = {
        target: e.target,
        clientX: changedTouch.clientX,
        clientY: changedTouch.clientY,
        pointerId: -1
      } as PointerEvent;
      onPointerUp(fakePointerEvent);
    }

    panel.addEventListener('pointerdown', onPointerDown);
    panel.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      panel.removeEventListener('pointerdown', onPointerDown);
      panel.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [panelRef, side, active, onClose]);

  return dragState;
}

// 🔥 TOP/BOTTOM DRAG - IMPROVED WITH BETTER SCROLLING LOGIC
type DrawerMode = 'normal' | 'expanded' | 'minimized';

function useTopBottomDrag(
  panelRef: React.RefObject<HTMLElement>,
  side: 'top' | 'bottom',
  size: DrawerSize,
  active: boolean,
  expandMode: boolean,
  minimizeMode: boolean,
  onClose: () => void,
  onMinimize?: () => void,
  onRestore?: () => void
) {
  const [mode, setMode] = useState<DrawerMode>('normal');
  const [dragState, setDragState] = useState({
    isDragging: false,
    offset: 0,
    progress: 0,
    scale: 1,
    realTimeHeight: null as number | null,
    startTime: 0,
    lastY: 0,
    velocity: 0,
  });

  // Get drawer heights based on size
  const getHeights = useCallback(() => {
    const windowHeight = window.innerHeight;
    const headerHeight = 80;
    
    const dockHeights = {
      's': Math.round(windowHeight * 0.55),
      'm': Math.round(windowHeight * 0.65),
      'l': Math.round(windowHeight * 0.75),
      'xl': Math.round(windowHeight * 0.88),
      'fullscreen': windowHeight
    };
    
    return {
      header: headerHeight,
      dock: size === 'fullscreen' ? windowHeight : dockHeights[size],
      full: windowHeight - 32
    };
  }, [size]);

  // Reset to normal when drawer closes
  useEffect(() => {
    if (!active) setMode('normal');
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    if (!panel) return;

    // Improved drag tracking with better commit logic
    const ref = {
      startY: 0,
      startX: 0,
      lastY: 0,
      startTime: 0,
      committed: false,
      velocities: [] as number[],
      target: null as HTMLElement | null,
      heightAtStart: 0,
      isInteractiveTarget: false,
      startedInBody: false,
      gestureIgnored: false,
    };

    const MOVEMENT_DEADZONE = 8; // px - more generous deadzone
    const INTERACTIVE_DEADZONE = 16; // px - require more intent for interactive elements
    const CLOSE_THRESHOLD = 0.4; // 40% travel to close
    const VELOCITY_THRESHOLD = 0.5; // px/ms for swipe detection

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      
      // Reset tracking state
      ref.startY = e.clientY;
      ref.startX = e.clientX;
      ref.lastY = e.clientY;
      ref.startTime = Date.now();
      ref.committed = false;
      ref.velocities = [];
      ref.target = target;
      ref.heightAtStart = panel.getBoundingClientRect().height;
      ref.isInteractiveTarget = !!(target.closest('button, a, [role="button"], input, select, textarea') || target.isContentEditable);
      ref.startedInBody = !!target.closest('.drawer__body');
      ref.gestureIgnored = !!target.closest('[data-drawer-gesture="ignore"], [data-gesture-ignore]');
      
      // Don't prevent default or capture yet - allow native scrolling until drag commits
      setDragState(prev => ({ ...prev, isDragging: false }));
    }

    function onPointerMove(e: PointerEvent) {
      if (!ref.startY) return;
      
      const currentY = e.clientY;
      const currentX = e.clientX;
      const totalDeltaY = currentY - ref.startY;
      const totalDeltaX = currentX - ref.startX;
      const now = Date.now();
      
      // Calculate velocity
      const rawDelta = currentY - ref.lastY;
      const velocity = rawDelta / Math.max(1, now - ref.startTime);
      ref.velocities.push(velocity);
      if (ref.velocities.length > 6) ref.velocities.shift();
      ref.lastY = currentY;
      
      // Determine if this should be a drawer drag
      if (!ref.committed) {
        const moved = Math.abs(totalDeltaY);
        if (moved < MOVEMENT_DEADZONE) return; // Allow native scroll
        
        // Axis dominance check
        const verticalDominant = Math.abs(totalDeltaY) >= Math.abs(totalDeltaX) * 1.2;
        
        let canCommit = false;
        
        // Better scroll boundary detection
        const bodyEl = panel.querySelector('.drawer__body[data-scrollable="true"]') as HTMLElement;
        
        // Direction logic depends on drawer side
        const isExpanding = side === 'bottom' ? totalDeltaY < 0 : totalDeltaY > 0; // up for bottom, down for top
        const isClosing = side === 'bottom' ? totalDeltaY > 0 : totalDeltaY < 0; // down for bottom, up for top
        
        if (mode === 'minimized') {
          // MINIMIZED MODE: Always allow drag since body content is hidden
          canCommit = verticalDominant && (!ref.isInteractiveTarget || moved >= INTERACTIVE_DEADZONE);
        } else if (ref.startedInBody && bodyEl) {
          const atTop = bodyEl.scrollTop <= 1;
          const atBottom = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 1;
          const hasScrollableContent = bodyEl.scrollHeight > bodyEl.clientHeight + 10;
          
          if (!hasScrollableContent) {
            // No scrollable content - allow drag if vertical dominant
            canCommit = verticalDominant && (!ref.isInteractiveTarget || moved >= INTERACTIVE_DEADZONE);
          } else {
            // Has scrollable content - check mode and boundaries
            if (mode === 'normal' && expandMode) {
              // EXPAND MODE: Disable scroll by default, allow expansion
              if (side === 'bottom') {
                if (isExpanding) {
                  // Always allow drag up to expand in normal+expand mode
                  canCommit = verticalDominant;
                } else if (isClosing && atTop) {
                  // At top, allow drag down to close/minimize
                  canCommit = verticalDominant;
                }
              } else if (side === 'top') {
                if (isExpanding) {
                  // Always allow drag down to expand in normal+expand mode
                  canCommit = verticalDominant;
                } else if (isClosing && atBottom) {
                  // At bottom, allow drag up to close
                  canCommit = verticalDominant;
                }
              }
            } else {
              // NORMAL MODE or EXPANDED MODE: Standard boundary checking
              if (side === 'bottom') {
                if (isClosing && atTop) {
                  // At scroll top, allow drag down to close/minimize
                  canCommit = verticalDominant;
                } else if (isExpanding && atBottom) {
                  // At scroll bottom, allow drag up only if expand enabled
                  canCommit = verticalDominant && mode === 'normal' && expandMode;
                }
              } else if (side === 'top') {
                if (isExpanding && atTop) {
                  // At scroll top, allow drag down to expand (normal mode only)
                  canCommit = verticalDominant && mode === 'normal' && expandMode;
                } else if (isClosing && atTop) {
                  // At scroll top, allow drag up to close/minimize ONLY if not trying to scroll
                  // In expanded mode, only allow close if already at scroll boundary
                  canCommit = verticalDominant && (mode !== 'expanded' || bodyEl.scrollTop === 0);
                } else if (isClosing && atBottom) {
                  // At scroll bottom, allow drag up to close
                  canCommit = verticalDominant;
                }
              }
            }
          }
        } else {
          // Not in body (header/footer) - allow drag if vertical dominant
          canCommit = verticalDominant && (!ref.isInteractiveTarget || moved >= INTERACTIVE_DEADZONE);
        }
        
        if (!canCommit) {
          // Show scale effect only in specific cases
          if (ref.startedInBody && bodyEl && moved > MOVEMENT_DEADZONE) {
            const atTop = bodyEl.scrollTop <= 1;
            const atBottom = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 1;
            const hasScrollableContent = bodyEl.scrollHeight > bodyEl.clientHeight + 10;
            
            let shouldShowScaleEffect = false;
            
            if (hasScrollableContent) {
              // Scale effect ONLY when at scroll end trying to scroll more
              if (side === 'bottom') {
                // Bottom drawer: At scroll bottom + drag up = scale effect (trying to scroll more up)
                if (atBottom && isExpanding) {
                  shouldShowScaleEffect = true;
                }
              } else if (side === 'top') {
                // Top drawer: At scroll top + drag down = scale effect (trying to scroll more down)
                if (atTop && isExpanding) {
                  shouldShowScaleEffect = true;
                }
              }
              
              if (shouldShowScaleEffect) {
                // Smooth, pressure-based scale effect that starts very gently
                const startDistance = 15; // Distance before any effect shows
                const maxDistance = 250; // Distance to reach max scale
                const maxScale = 0.03; // Maximum scale amount (3%)
                
                // Only start scaling after initial distance threshold
                const effectiveDistance = Math.max(0, moved - startDistance);
                const normalizedDistance = Math.min(effectiveDistance / (maxDistance - startDistance), 1);
                
                // Very smooth curve that starts extremely gentle
                const smoothFactor = Math.pow(normalizedDistance, 2.2); // Even gentler start
                const elasticScale = 1 + (smoothFactor * maxScale);
                
                setDragState(prev => ({ ...prev, isDragging: true, scale: elasticScale, offset: 0, progress: 0 }));
              } else {
                // Reset scale when not showing effect
                setDragState(prev => ({ ...prev, scale: 1 }));
              }
            }
          }
          return; // Don't commit, allow native scroll
        }
        
        // Commit to drawer drag
        ref.committed = true;
        try {
          panel.setPointerCapture(e.pointerId);
        } catch {}
      }
      
      if (ref.committed) {
        updateDragVisuals(totalDeltaY, currentY);
        e.preventDefault();
        e.stopPropagation();
      }
    }

    function updateDragVisuals(totalDelta: number, currentY: number) {
      const heights = getHeights();
      const currentModeHeight = mode === 'expanded' ? heights.full : 
                              mode === 'minimized' ? heights.header : heights.dock;
      const sign = side === 'bottom' ? 1 : -1; // bottom: positive down, top: positive up
      const closingDelta = totalDelta * sign; // positive = closing direction
      
      let newHeight = currentModeHeight;
      let scale = 1;
      let progress = 0;
      let offset = 0;
      
      // Calculate velocity for later use
      const avgVelocity = ref.velocities.length > 0 ? 
        ref.velocities.reduce((sum, v) => sum + v, 0) / ref.velocities.length : 0;
      
      if (closingDelta > 0) {
        // CLOSING DIRECTION (down for bottom drawer, up for top drawer)
        
        // Define minAllowed and shrinkCapacity for all modes
        const minAllowed = (() => {
          if (mode === 'expanded') return heights.dock; // Can shrink to dock first
          if (mode === 'normal' && minimizeMode && side === 'bottom') return heights.header; // Can minimize
          if (mode === 'minimized') return -heights.header; // Allow dragging completely off-screen
          return 20; // Minimum before closing
        })();
        
        const shrinkCapacity = Math.max(0, currentModeHeight - minAllowed);
        
        if (mode === 'minimized') {
          // MINIMIZED MODE: Direct drag following - move with user's finger
          offset = closingDelta;
          progress = Math.min(closingDelta / (heights.header * 0.5), 1);
          // Keep the current height, just move the position
          newHeight = currentModeHeight;
        } else {
          // OTHER MODES: Height shrinking logic
          const shrinkAmount = Math.min(closingDelta, shrinkCapacity);
          
          if (shrinkAmount > 0) {
            newHeight = currentModeHeight - shrinkAmount;
            const remainingDelta = closingDelta - shrinkAmount;
            
            // Show progress based on how close we are to minimize threshold
            if (mode === 'normal' && minimizeMode && side === 'bottom') {
              // Show progress toward minimize (20% of dock height)
              const minimizeThreshold = heights.dock * 0.2;
              progress = Math.min(closingDelta / minimizeThreshold, 1);
            } else {
              // Standard progress calculation
              progress = Math.min(closingDelta / (heights.dock * CLOSE_THRESHOLD), 1);
            }
            
            if (remainingDelta > 0) {
              // Show offset after height shrinking is done
              offset = remainingDelta;
            }
          } else {
            // No shrinking possible, show offset directly
            offset = closingDelta;
            progress = offset / (heights.dock * 0.6);
          }
          
          // Smooth elongation effect when trying to drag past minimum (not in minimized mode)
          if (newHeight <= minAllowed && closingDelta > shrinkCapacity) {
            const excess = closingDelta - shrinkCapacity;
            const maxDistance = minAllowed * 0.4; // Distance to reach max scale
            const normalizedDistance = Math.min(excess / maxDistance, 1);
            const smoothFactor = Math.pow(normalizedDistance, 1.5); // Smooth curve
            scale = 1 + (smoothFactor * 0.1); // Max 10% scale
          }
        }
      } else {
        // OPENING DIRECTION (up for bottom drawer, down for top drawer)  
        const openingAmount = Math.abs(closingDelta);
        
        if (mode === 'normal' && expandMode) {
          // Normal mode with expand: allow real growth
          const maxGrowth = heights.full - currentModeHeight;
          const growAmount = Math.min(openingAmount, maxGrowth);
          newHeight = currentModeHeight + growAmount;
          
          // Smooth elongation effect if trying to expand beyond full
          if (openingAmount > maxGrowth) {
            const excess = openingAmount - maxGrowth;
            const maxDistance = heights.full * 0.3; // Distance to reach max scale
            const normalizedDistance = Math.min(excess / maxDistance, 1);
            const smoothFactor = Math.pow(normalizedDistance, 1.5); // Smooth curve
            scale = 1 + (smoothFactor * 0.08); // Max 8% scale
          }
        } else if (mode === 'minimized') {
          // Minimized: allow growth to dock size
          const maxGrowth = heights.dock - currentModeHeight;
          const growAmount = Math.min(openingAmount, maxGrowth);
          newHeight = currentModeHeight + growAmount;
        } else {
          // Smooth elastic effect for wrong-direction drag
          const maxDistance = currentModeHeight * 0.4; // Distance to reach max scale
          const normalizedDistance = Math.min(openingAmount / maxDistance, 1);
          const smoothFactor = Math.pow(normalizedDistance, 1.6); // Gentle start
          scale = 1 + (smoothFactor * 0.06); // Max 6% scale
        }
      }
      
      setDragState({ 
        isDragging: true, 
        offset, 
        progress: Math.min(progress, 1), 
        scale, 
        realTimeHeight: newHeight,
        startTime: ref.startTime,
        lastY: currentY,
        velocity: avgVelocity
      });
    }

    function onPointerUp(e: PointerEvent) {
      // Release pointer capture
      try {
        if (panel.hasPointerCapture?.(e.pointerId)) {
          panel.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore if not a real pointer event
      }

      if (!ref.committed) {
        resetDragState();
        return;
      }

      const heights = getHeights();
      const totalDelta = e.clientY - ref.startY;
      const sign = side === 'bottom' ? 1 : -1;
      const closingDelta = totalDelta * sign;
      
      // Calculate average velocity
      const avgVelocity = ref.velocities.length > 0 ? 
        ref.velocities.reduce((sum, v) => sum + v, 0) / ref.velocities.length : 0;
      const isSwipeClosing = avgVelocity * sign > VELOCITY_THRESHOLD; // Fast swipe in closing direction
      const isSwipeOpening = avgVelocity * sign < -VELOCITY_THRESHOLD; // Fast swipe in opening direction
      
      const hadRealDrawerDrag = Math.abs(totalDelta) > 30;
      const shouldUseSwipe = hadRealDrawerDrag;
      
      // 3-MODE SYSTEM LOGIC
      if (mode === 'normal') {
        if (expandMode && (shouldUseSwipe && isSwipeOpening || closingDelta < -heights.dock * 0.3)) {
          // EXPAND: Always check this first
          setMode('expanded');
        } else if (minimizeMode && (side === 'bottom' || side === 'top')) {
          // MINIMIZE MODE LOGIC: Always prioritize minimize over close (identical for both top and bottom)
          if (closingDelta > heights.dock * 0.15) {
            // Lower threshold for minimize (easier to activate)
            setMode('minimized');
            onMinimize?.();
          } else if (shouldUseSwipe && isSwipeClosing && avgVelocity * sign > VELOCITY_THRESHOLD * 3 && closingDelta > heights.dock * 1.2) {
            // Require VERY fast swipe AND very high distance to skip minimize
            onClose();
          }
          // If neither condition met, do nothing (stay in normal mode)
        } else if (shouldUseSwipe && isSwipeClosing && closingDelta > heights.dock * 0.6) {
          // CLOSE: Standard close logic when minimize is not enabled
          onClose();
        } else if (!minimizeMode && closingDelta > heights.dock * CLOSE_THRESHOLD) {
          // CLOSE: Standard close logic only when minimize is disabled
          onClose();
        }
      } 
      else if (mode === 'minimized') {
        if ((shouldUseSwipe && isSwipeOpening) || closingDelta < -heights.header * 0.5) {
          setMode('normal');
          onRestore?.();
        } else if ((shouldUseSwipe && isSwipeClosing) || closingDelta > heights.header * 0.5) {
          // Easy close in minimized mode - only need half header height drag
          onClose();
        }
        // Allow free dragging in minimized mode - no intermediate restrictions
      }
      else if (mode === 'expanded') {
        if (shouldUseSwipe && isSwipeClosing) {
          onClose();
        } else if (closingDelta > heights.full * 0.4) {
          onClose();
        } else if (closingDelta > heights.dock * 0.3) {
          setMode('normal');
        }
      }

      resetDragState();
    }

    function resetDragState() {
      setDragState({ isDragging: false, offset: 0, progress: 0, scale: 1, realTimeHeight: null, startTime: 0, lastY: 0, velocity: 0 });
      
      // Reset tracking state
      ref.startY = 0;
      ref.startX = 0;
      ref.lastY = 0;
      ref.startTime = 0;
      ref.committed = false;
      ref.velocities = [];
      ref.target = null;
      ref.heightAtStart = 0;
      ref.isInteractiveTarget = false;
      ref.startedInBody = false;
      ref.gestureIgnored = false;
    }

    // Touch handlers that mirror pointer logic
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      
      // Create a fake pointer event to reuse logic
      const fakePointerEvent = {
        target: e.target,
        clientY: touch.clientY,
        clientX: touch.clientX,
        pointerId: -1
      } as PointerEvent;
      
      onPointerDown(fakePointerEvent);
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      
      const fakePointerEvent = {
        target: e.target,
        clientY: touch.clientY,
        clientX: touch.clientX,
        pointerId: -1,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation()
      } as PointerEvent;
      
      onPointerMove(fakePointerEvent);
    }

    function onTouchEnd(e: TouchEvent) {
      const changedTouch = e.changedTouches[0];
      if (!changedTouch) return;
      
      const fakePointerEvent = {
        target: e.target,
        clientY: changedTouch.clientY,
        clientX: changedTouch.clientX,
        pointerId: -1
      } as PointerEvent;
      
      onPointerUp(fakePointerEvent);
    }

    panel.addEventListener('pointerdown', onPointerDown);
    panel.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      panel.removeEventListener('pointerdown', onPointerDown);
      panel.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [panelRef, side, active, expandMode, minimizeMode, mode, size, getHeights, onClose, onMinimize, onRestore]);

  // Return current height based on mode
  const currentHeight = mode === 'expanded' ? getHeights().full : 
                       mode === 'minimized' ? getHeights().header : null;

  return { 
    dragState, 
    mode, 
    currentHeight,
    isMinimized: mode === 'minimized',
    // Expose function to programmatically minimize
    setMinimized: () => {
      setMode('minimized');
      onMinimize?.();
    }
  };
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  open = isOpen,
  onClose,
  side = 'left',
  size = 'm',
  dismissible = true,
  swipeToClose = true,
  backdrop = true,
  trapFocus = true,
  initialFocusRef,
  className,
  backdropClassName,
  panelClassName,
  expandMode = false,
  minimizeMode = false,
  onMinimize,
  onRestore,
  bottomOffset = 0,
  title,
  description,
  scrollable = true,
  fullscreen = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  children,
}) => {
  const id = useId();
  const portalRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosingFromMinimized, setIsClosingFromMinimized] = useState(false);

  // Handle opening/closing animations
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosingFromMinimized(false); // Reset when opening
      const timer = setTimeout(() => setIsAnimating(true), 16);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 450);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Create portal mount
  useEffect(() => {
    let root = document.getElementById('drawer-root');
    if (!root) {
      root = document.createElement('div');
      root.setAttribute('id', 'drawer-root');
      document.body.appendChild(root);
    }
    portalRef.current = root;
  }, []);

  // ESC to close
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  // Mobile viewport and offset handling
  useEffect(() => {
    // Set CSS custom properties for mobile viewport stability
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Set bottom offset CSS variable
    document.documentElement.style.setProperty('--drawer-bottom-offset', `${bottomOffset}px`);
    
    // Update viewport height on mount and resize
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      // Clean up offset when drawer unmounts
      document.documentElement.style.removeProperty('--drawer-bottom-offset');
    };
  }, [bottomOffset]);

  // Hooks
  const isVertical = side === 'top' || side === 'bottom';
  
  const leftRightDrag = useLeftRightDrag(
    panelRef as React.RefObject<HTMLElement>,
    side as 'left' | 'right',
    shouldRender && swipeToClose && !isVertical,
    onClose
  );
  
  const topBottomDrag = useTopBottomDrag(
    panelRef as React.RefObject<HTMLElement>,
    side as 'top' | 'bottom',
    size,
    shouldRender && swipeToClose && isVertical,
    expandMode,
    minimizeMode,
    onClose,
    onMinimize,
    onRestore
  );

  const dragState = isVertical ? topBottomDrag.dragState : leftRightDrag;
  const currentHeight = isVertical ? topBottomDrag.currentHeight : null;
  const isMinimized = isVertical ? topBottomDrag.isMinimized : false;

  // Handle closing from minimized state detection
  useEffect(() => {
    if (!open && isMinimized) {
      setIsClosingFromMinimized(true);
    }
    if (open) {
      // Reset after animation completes
      const timer = setTimeout(() => setIsClosingFromMinimized(false), 500);
      return () => clearTimeout(timer);
    }
  }, [open, isMinimized]);

  // Body scroll management - only lock when drawer is open and NOT minimized
  useLockBodyScroll(shouldRender && !isMinimized);
  useFocusTrap(panelRef as React.RefObject<HTMLElement>, shouldRender && trapFocus, initialFocusRef);

  // Overscroll management for mobile browsers - only when not minimized
  useEffect(() => {
    if (!shouldRender) return;
    
    if (!isMinimized) {
      document.body.classList.add('drawer-active-not-minimized');
      document.documentElement.classList.add('drawer-active');
    } else {
      document.body.classList.remove('drawer-active-not-minimized');
      document.documentElement.classList.add('drawer-active'); // Keep html class even when minimized
    }
    
    return () => {
      document.body.classList.remove('drawer-active-not-minimized');
      document.documentElement.classList.remove('drawer-active');
    };
  }, [shouldRender, isMinimized]);

  // Body scroll management - simplified
  useEffect(() => {
    if (!shouldRender) return;
    const panel = panelRef.current;
    const drawerBody = panel?.querySelector('.drawer__body[data-scrollable="true"]') as HTMLElement;
    if (!drawerBody) return;
    
    // Content scroll management based on mode
    if (isVertical && expandMode && !isMinimized && topBottomDrag.mode === 'normal') {
      // NORMAL mode with expand: disable content scroll to allow drawer expansion
      drawerBody.style.overflow = 'hidden';
      drawerBody.style.touchAction = 'none';
    } else if (isVertical && !isMinimized && topBottomDrag.mode === 'expanded') {
      // EXPANDED mode: enable content scroll so user can scroll back to top
      drawerBody.style.overflow = 'auto';
      drawerBody.style.touchAction = 'pan-y';
    } else if (!isMinimized) {
      // All other cases: normal scrolling
      drawerBody.style.overflow = 'auto';
      drawerBody.style.touchAction = 'pan-y';
    }
  }, [shouldRender, expandMode, isMinimized, isVertical, topBottomDrag.mode]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (!dismissible || isMinimized) return;
    if (e.target !== e.currentTarget) return;
    
    // Check current mode for vertical drawers (top/bottom)
    const currentMode = isVertical ? topBottomDrag.mode : 'normal';
    
    // If minimize mode is enabled and we're in normal or expanded state, minimize first
    if (minimizeMode && (side === 'bottom' || side === 'top') && (currentMode === 'normal' || currentMode === 'expanded')) {
      // First click: minimize instead of close
      if (currentMode === 'expanded') {
        // From expanded -> normal first, then user can click again to minimize
        // This prevents accidental minimize from expanded state
        return; // Do nothing, let user drag or click again
      } else {
        // From normal -> minimize on backdrop click
        topBottomDrag.setMinimized();
        return;
      }
    }
    
    // Default behavior: close the drawer
    onClose();
  }, [dismissible, isMinimized, onClose, minimizeMode, side, isVertical, topBottomDrag.mode, topBottomDrag.setMinimized]);

  if (!portalRef.current || !shouldRender) return null;

  const drawerClasses = bem('drawer', [
    'mounted',
    isAnimating && 'open',
    isMinimized && 'minimized',
    isClosingFromMinimized && 'closing-from-minimized',
    isVertical && topBottomDrag.mode === 'expanded' && 'expanded',
    `side-${side}`,
    size === 'fullscreen' ? 'fullscreen' : `size-${size}`,
  ]);

  const panelStyle: React.CSSProperties = {
    height: (() => {
      // Use real-time height during drag for smooth following
      if (dragState.isDragging && dragState.realTimeHeight && isVertical) {
        return `${dragState.realTimeHeight}px`;
      }
      // Use mode-based height when not dragging
      return currentHeight ? `${currentHeight}px` : undefined;
    })(),
    transform: (() => {
      if (!dragState.isDragging) return undefined;
      
      const transforms = [];
      
      // Offset transform
      if (dragState.offset > 0) {
        switch (side) {
          case 'left': transforms.push(`translateX(${-dragState.offset}px)`); break;
          case 'right': transforms.push(`translateX(${dragState.offset}px)`); break;
          case 'top': transforms.push(`translateY(${-dragState.offset}px)`); break;
          case 'bottom': transforms.push(`translateY(${dragState.offset}px)`); break;
        }
      }
      
      // Scale transform for elongation effect
      if (dragState.scale !== 1) {
        if (side === 'left' || side === 'right') {
          transforms.push(`scaleX(${dragState.scale})`);
        } else {
          // For top/bottom drawers, use scaleY for vertical elongation effect
          transforms.push(`scaleY(${dragState.scale})`);
        }
      }
      
      return transforms.length > 0 ? transforms.join(' ') : undefined;
    })(),
    transformOrigin: dragState.scale !== 1 ? (() => {
      switch (side) {
        case 'left': return 'left center !important';
        case 'right': return 'right center !important';
        case 'top': return 'center top !important';
        case 'bottom': return 'center bottom !important';
      }
    })() : undefined,
    transition: dragState.isDragging ? 'none' : undefined,
    willChange: dragState.isDragging ? 'transform, height' : 'auto',
  };

  const backdropStyle: React.CSSProperties = dragState.isDragging ? {
    opacity: Math.max(0.1, 1 - dragState.progress * 0.8),
    transition: 'none'
  } : {};

  // Don't show backdrop in minimized mode
  const showBackdrop = backdrop && !isMinimized;

  const content = (
    <div 
      className={[drawerClasses, className].filter(Boolean).join(' ')} 
      role="presentation"
      data-dragging={dragState.isDragging}
    >
      {showBackdrop && (
        <div 
          className={['drawer__backdrop', backdropClassName].filter(Boolean).join(' ')} 
          onClick={handleBackdropClick}
          style={backdropStyle}
        />
      )}
      <div
        ref={panelRef}
        className={['drawer__panel', panelClassName].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : ariaLabelledby || `${id}-title`}
        aria-describedby={ariaDescribedby || `${id}-description`}
        tabIndex={-1}
        style={panelStyle}
        data-drawer-state={isVertical ? topBottomDrag.mode : 'normal'}
        data-dragging={dragState.isDragging}
        data-drag-progress={dragState.progress}
      >
        {(
          // Always show handle for top/bottom; for left/right show only while dragging
          (side === 'top' || side === 'bottom') || (dragState.isDragging && dragState.progress > 0)
        ) && (
          <div 
            className="drawer__drag-indicator" 
            data-side={side}
            style={{
              // Force visible positioning
              position: 'absolute',
              backgroundColor: '#d1d5db', // Gray background
              zIndex: 1000,
              opacity: 1,
              borderRadius: '999px',
              // Position based on side
              ...(side === 'bottom' ? {
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '86px',
                height: '4px'
              } : side === 'top' ? {
                bottom: '4px', 
                left: '50%',
                transform: 'translateX(-50%)',
                width: '86px',
                height: '4px'
              } : side === 'right' ? {
                top: '50%',
                left: '4px',
                transform: 'translateY(-50%)',
                width: '4px',
                height: '86px'
              } : {
                top: '50%',
                right: '4px',
                transform: 'translateY(-50%)',
                width: '4px', 
                height: '86px'
              })
            }}
          >
            <div 
              className="drawer__drag-progress"
              style={{
                position: 'absolute',
                backgroundColor: '#3b82f6', // Blue progress
                borderRadius: 'inherit',
                transition: dragState.isDragging ? 'none' : 'all 0.1s ease-out',
                // Progress fills based on drag direction and side
                ...(side === 'bottom' || side === 'top' ? {
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${Math.min(Math.max(dragState.progress * 100, 0), 100)}%`
                } : {
                  left: 0,
                  bottom: 0,
                  right: 0, 
                  height: `${Math.min(Math.max(dragState.progress * 100, 0), 100)}%`
                })
              }}
            />
          </div>
        )}
        {title || description ? (
          <>
            <DrawerHeader>
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </DrawerHeader>
            <DrawerBody scrollable={scrollable}>
              {children}
            </DrawerBody>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalRef.current);
};
export interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}
export const DrawerHeader: React.FC<DrawerHeaderProps> = ({ className, ...props }) => (
  <div className={["drawer__header", className].filter(Boolean).join(' ')} {...props} />
);

export interface DrawerBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /**
   * If true, the body will have overflow-y: auto and handle scrolling internally.
   * If false, the body will not scroll, and drags will always move the drawer.
   * @default true
   */
  scrollable?: boolean;
}
export const DrawerBody: React.FC<DrawerBodyProps> = ({ className, scrollable = true, ...props }) => (
  <div 
    className={["drawer__body", className].filter(Boolean).join(' ')} 
    data-scrollable={scrollable}
    {...props} 
  />
);

export interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}
export const DrawerFooter: React.FC<DrawerFooterProps> = ({ className, ...props }) => (
  <div className={["drawer__footer", className].filter(Boolean).join(' ')} {...props} />
);

export interface DrawerTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' }
export const DrawerTitle: React.FC<DrawerTitleProps> = ({ className, as: Tag = 'h2', id, ...props }) => (
  <Tag id={id} className={["drawer__title", className].filter(Boolean).join(' ')} {...props} />
);

export interface DrawerDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> { as?: 'p' | 'div' | 'span' }
export const DrawerDescription: React.FC<DrawerDescriptionProps> = ({ className, as: Tag = 'p', id, ...props }) => (
  <Tag id={id} className={["drawer__description", className].filter(Boolean).join(' ')} {...props} />
);

export default Drawer;


