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
    scaleConfig: null as {
      type: 'vertical' | 'horizontal';
      direction: 'up' | 'down' | 'left' | 'right';
      origin: string;
      axis: 'scaleX' | 'scaleY';
    } | null,
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
      startRelativeX: 0,
      startRelativeY: 0,
      panelStartLeft: 0,
      panelStartTop: 0,
    };

    const MOVEMENT_DEADZONE = 8;
    const INTERACTIVE_DEADZONE = 16;
    const CLOSE_THRESHOLD = 0.4;
    const VELOCITY_THRESHOLD = 0.5;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      const panelRect = panel.getBoundingClientRect();

      ref.startX = e.clientX;
      ref.startY = e.clientY;
      ref.lastX = e.clientX;
      ref.startTime = Date.now();
      ref.committed = false;
      ref.velocities = [];
      ref.target = target;
      ref.isInteractiveTarget = !!(target.closest('button, a, [role="button"], input, select, textarea') || target.isContentEditable);

      // Better position tracking for left/right drawers
      const relativeX = e.clientX - panelRect.left;
      const relativeY = e.clientY - panelRect.top;
      ref.startRelativeX = relativeX;
      ref.startRelativeY = relativeY;
      ref.panelStartLeft = panelRect.left;
      ref.panelStartTop = panelRect.top;

      setDragState(prev => ({ ...prev, isDragging: false, scale: 1 }));
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
        // More responsive deadzone for left/right drawers
        const adaptiveDeadzone = Math.max(MOVEMENT_DEADZONE * 0.8, 6);
        if (moved < adaptiveDeadzone) return;
        
        // Horizontal dominance check - less strict for better responsiveness
        const horizontalDominant = Math.abs(totalDeltaX) >= Math.abs(totalDeltaY) * 1.1;
        
        const canCommit = horizontalDominant && (!ref.isInteractiveTarget || moved >= INTERACTIVE_DEADZONE);
        
        if (!canCommit) {
          // Revolutionary horizontal scale system with perfect transform origins
          const sign = side === 'left' ? -1 : 1;
          const wrongDirectionDelta = totalDeltaX * -sign; // Opposite of closing direction

          if (wrongDirectionDelta > 0 && moved > 15) {
            // Perfect horizontal scale configuration
            const scaleConfig = {
              type: 'horizontal' as const,
              direction: side === 'left' ? 'right' as const : 'left' as const,
              origin: side === 'left' ? 'left center' : 'right center',
              axis: 'scaleX' as const
            };

            // Professional horizontal scale mathematics
            const startDistance = 15;
            const elasticDistance = 60;
            const maxElasticDistance = 150;
            const maxScale = 0.08; // Professional 8% maximum for horizontal

            const effectiveDistance = Math.max(0, wrongDirectionDelta - startDistance);

            let scale = 1;
            if (effectiveDistance <= elasticDistance) {
              // Phase 1: Smooth linear response
              const linearProgress = effectiveDistance / elasticDistance;
              scale = 1 + (linearProgress * maxScale * 0.7); // 70% in linear phase
            } else {
              // Phase 2: Natural elastic resistance
              const elasticExtra = effectiveDistance - elasticDistance;
              const elasticProgress = elasticExtra / (maxElasticDistance - elasticDistance);
              const clampedElastic = Math.min(elasticProgress, 1);

              // Perfect elastic physics simulation
              const elasticFactor = 1 - Math.pow(1 - clampedElastic, 2.2);
              scale = 1 + (maxScale * 0.7) + (maxScale * 0.3 * elasticFactor);
            }

            setDragState(prev => ({
              ...prev,
              isDragging: true,
              scale,
              scaleConfig,
              offset: 0,
              progress: 0
            }));
          } else {
            setDragState(prev => ({
              ...prev,
              scale: 1,
              scaleConfig: null,
              isDragging: false
            }));
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
        // Professional wrong-direction scale with perfect transform origin
        const openingAmount = Math.abs(closingDelta);

        // Professional elastic mathematics for wrong direction
        const startDistance = 20;
        const maxDistance = 160;
        const maxScale = 0.06; // Professional 6% for wrong direction

        const effectiveDistance = Math.max(0, openingAmount - startDistance);
        const normalizedDistance = Math.min(effectiveDistance / (maxDistance - startDistance), 1);

        // Perfect elastic curve for natural feel
        const elasticFactor = 1 - Math.pow(1 - normalizedDistance, 2.3);
        scale = 1 + (elasticFactor * maxScale);

        // Perfect scale config for wrong direction
        const scaleConfig = {
          type: 'horizontal' as const,
          direction: side === 'left' ? 'right' as const : 'left' as const,
          origin: side === 'left' ? 'left center' : 'right center',
          axis: 'scaleX' as const
        };
      }
      
      setDragState({
        isDragging: true,
        offset,
        progress,
        scale,
        scaleConfig: scale !== 1 ? {
          type: 'horizontal' as const,
          direction: side === 'left' ? 'right' as const : 'left' as const,
          origin: side === 'left' ? 'left center' : 'right center',
          axis: 'scaleX' as const
        } : null,
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
      setDragState({ isDragging: false, offset: 0, progress: 0, scale: 1, scaleConfig: null, realTimeHeight: null, startTime: 0, lastY: 0, velocity: 0 });
      ref.startX = 0;
      ref.startY = 0;
      ref.lastX = 0;
      ref.startTime = 0;
      ref.committed = false;
      ref.velocities = [];
      ref.target = null;
      ref.isInteractiveTarget = false;
      ref.startRelativeX = 0;
      ref.startRelativeY = 0;
      ref.panelStartLeft = 0;
      ref.panelStartTop = 0;
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
    scaleConfig: null as {
      type: 'vertical' | 'horizontal';
      direction: 'up' | 'down' | 'left' | 'right';
      origin: string;
      axis: 'scaleX' | 'scaleY';
    } | null,
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

    // Advanced touch tracking with smooth conflict resolution
    const ref = {
      startY: 0,
      startX: 0,
      lastY: 0,
      startTime: 0,
      lastFrameTime: 0,
      committed: false,
      velocities: [] as number[],
      target: null as HTMLElement | null,
      heightAtStart: 0,
      isInteractiveTarget: false,
      startedInBody: false,
      gestureIgnored: false,
      startRelativeY: 0,
      startRelativeX: 0,
      panelStartTop: 0,
      panelStartLeft: 0,
      scrollStartTop: 0,
      scrollStartHeight: 0,
      // Advanced smooth behavior tracking
      lastTimeDragPrevented: 0,
      wasBeyondThePoint: false,
      hasTextSelection: false,
      scrollLockTimeout: 100, // ms
      swipeStartThreshold: 8, // px
      pointerType: 'touch' as 'touch' | 'mouse',
    };

    const MOVEMENT_DEADZONE = 8; // px - more generous deadzone
    const INTERACTIVE_DEADZONE = 16; // px - require more intent for interactive elements
    const CLOSE_THRESHOLD = 0.4; // 40% travel to close
    const VELOCITY_THRESHOLD = 0.5; // px/ms for swipe detection

    // Advanced dampen function for smooth velocity handling
    function dampenValue(v: number): number {
      return 8 * (Math.log(v + 1) - 2);
    }

    // Smart conflict resolution for smooth scroll/drag interactions
    function shouldDrag(element: HTMLElement, isDraggingInDirection: boolean): boolean {
      // Prevent drag on form elements and interactive controls
      const tagName = element.tagName.toLowerCase();
      if (['select', 'input', 'textarea', 'button', 'video', 'audio'].includes(tagName)) {
        return false;
      }

      // Respect explicit no-drag attributes
      if (element.hasAttribute('data-drawer-no-drag') ||
          element.closest('[data-drawer-no-drag]')) {
        return false;
      }

      // Prevent drag if text is selected
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        ref.hasTextSelection = true;
        return false;
      }

      // Check for recent scroll lock with timeout technique
      const now = performance.now();
      if (ref.lastTimeDragPrevented &&
          (now - ref.lastTimeDragPrevented) < ref.scrollLockTimeout) {
        return false;
      }

      // Traverse DOM to check for scrollable parents
      let currentElement = element;
      while (currentElement && currentElement !== panel) {
        const styles = window.getComputedStyle(currentElement);
        const overflow = styles.overflow + styles.overflowY + styles.overflowX;

        if (overflow.includes('scroll') || overflow.includes('auto')) {
          const hasScrollableContent = currentElement.scrollHeight > currentElement.clientHeight;

          if (hasScrollableContent) {
            const scrollTop = currentElement.scrollTop;
            const isAtTop = scrollTop <= 1;
            const isAtBottom = scrollTop + currentElement.clientHeight >= currentElement.scrollHeight - 1;

            // Check scroll position and direction for smart conflict resolution
            if (side === 'bottom') {
              // Bottom drawer: only allow drag if at scroll top OR dragging down to close
              if (!isAtTop && isDraggingInDirection && ref.startedInBody) {
                ref.lastTimeDragPrevented = now;
                return false;
              }
            } else if (side === 'top') {
              // Top drawer: only allow drag if at scroll bottom OR dragging up to close
              if (!isAtBottom && isDraggingInDirection && ref.startedInBody) {
                ref.lastTimeDragPrevented = now;
                return false;
              }
            }
          }
        }

        currentElement = currentElement.parentElement as HTMLElement;
      }

      return true;
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      const panelRect = panel.getBoundingClientRect();

      // Advanced state capture with smooth conflict resolution
      ref.startY = e.clientY;
      ref.startX = e.clientX;
      ref.lastY = e.clientY;
      ref.startTime = performance.now();
      ref.committed = false;
      ref.velocities = [];
      ref.target = target;
      ref.heightAtStart = panelRect.height;
      ref.pointerType = e.pointerType === 'mouse' ? 'mouse' : 'touch';

      // Enhanced interaction detection
      ref.isInteractiveTarget = !!(
        target.closest('button, a, [role="button"], input, select, textarea, [contenteditable="true"]') ||
        target.isContentEditable ||
        target.hasAttribute('draggable') ||
        target.closest('[data-drawer-no-drag]')
      );

      ref.startedInBody = !!target.closest('.drawer__body');
      ref.gestureIgnored = ref.isInteractiveTarget;

      // Reset advanced tracking state
      ref.wasBeyondThePoint = false;
      ref.hasTextSelection = false;

      // Ultra-precise position tracking
      ref.startRelativeY = e.clientY - panelRect.top;
      ref.startRelativeX = e.clientX - panelRect.left;
      ref.panelStartTop = panelRect.top;
      ref.panelStartLeft = panelRect.left;

      // Store scroll state for momentum preservation
      const bodyEl = panel.querySelector('.drawer__body[data-scrollable="true"]') as HTMLElement;
      if (bodyEl) {
        ref.scrollStartTop = bodyEl.scrollTop;
        ref.scrollStartHeight = bodyEl.scrollHeight;
      }

      // Ultra-conservative initial state
      setDragState(prev => ({ ...prev, isDragging: false, scale: 1, scaleConfig: null }));
    }

    function onPointerMove(e: PointerEvent) {
      if (!ref.startY) return;

      const currentY = e.clientY;
      const currentX = e.clientX;
      const totalDeltaY = currentY - ref.startY;
      const totalDeltaX = currentX - ref.startX;
      const now = performance.now();
      const deltaTime = Math.max(1, now - ref.startTime);

      // Advanced velocity calculation with momentum preservation
      const frameTime = Math.max(1, now - (ref.lastFrameTime || now));
      const instantVelocity = (currentY - ref.lastY) / frameTime;
      ref.velocities.push(instantVelocity);
      if (ref.velocities.length > 3) ref.velocities.shift();
      ref.lastY = currentY;
      ref.lastFrameTime = now;

      // Vaul's approach: Check if we should drag before any other logic
      if (!ref.committed) {
        const moved = Math.abs(totalDeltaY);
        const movedX = Math.abs(totalDeltaX);

        // Adaptive threshold based on pointer type
        const threshold = ref.pointerType === 'mouse' ? 4 : ref.swipeStartThreshold;
        if (moved < threshold) return;

        // Direction detection with hysteresis
        const axisRatio = moved / Math.max(movedX, 1);
        const isVerticalDominant = axisRatio >= 1.15;

        // Ultra-precise direction vectors
        const isExpanding = side === 'bottom' ? totalDeltaY < 0 : totalDeltaY > 0;
        const isClosing = side === 'bottom' ? totalDeltaY > 0 : totalDeltaY < 0;

        // Use shouldDrag function for intelligent conflict resolution
        const isDraggingInDirection = (side === 'bottom' && totalDeltaY !== 0) ||
                                     (side === 'top' && totalDeltaY !== 0);

        if (ref.target && !shouldDrag(ref.target, isDraggingInDirection)) {
          // Early return if scrolling should take precedence
          return;
        }

        // Additional gesture validation
        if (ref.gestureIgnored || !isVerticalDominant) {
          return;
        }

        // Beyond the point detection for gesture commitment
        if (moved > threshold * 2) {
          ref.wasBeyondThePoint = true;
        }

        // Commit to drag if all conditions pass
        ref.committed = true;
        try {
          panel.setPointerCapture(e.pointerId);
        } catch {}
      }

      if (ref.committed) {
        // Visual updates with smooth handling
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

      // Apply dampening to extreme values for smooth feel
      const rawClosingDelta = totalDelta * sign;
      const closingDelta = Math.abs(rawClosingDelta) > currentModeHeight * 0.8
        ? rawClosingDelta > 0
          ? currentModeHeight * 0.8 + dampenValue(rawClosingDelta - currentModeHeight * 0.8)
          : -(currentModeHeight * 0.8 + dampenValue(Math.abs(rawClosingDelta) - currentModeHeight * 0.8))
        : rawClosingDelta;
      
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
          
          // Professional elastic elongation with proper transform origin
          if (newHeight <= minAllowed && closingDelta > shrinkCapacity) {
            const excess = closingDelta - shrinkCapacity;
            const maxDistance = minAllowed * 0.5;
            const normalizedDistance = Math.min(excess / maxDistance, 1);

            // Perfect elastic physics with directional awareness
            const elasticFactor = 1 - Math.pow(1 - normalizedDistance, 2.0);
            scale = 1 + (elasticFactor * 0.08); // Professional 8% max

            // Set perfect scale config for closing direction
            const scaleConfig = {
              type: 'vertical' as const,
              direction: side === 'bottom' ? 'down' as const : 'up' as const,
              origin: side === 'bottom' ? 'center bottom' : 'center top',
              axis: 'scaleY' as const
            };

            setDragState({
              isDragging: true,
              offset,
              progress: Math.min(progress, 1),
              scale,
              scaleConfig,
              realTimeHeight: newHeight,
              startTime: ref.startTime,
              lastY: currentY,
              velocity: avgVelocity
            });
            return;
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
          
          // Professional expansion beyond limits with proper transform origin
          if (openingAmount > maxGrowth) {
            const excess = openingAmount - maxGrowth;
            const maxDistance = heights.full * 0.4;
            const normalizedDistance = Math.min(excess / maxDistance, 1);

            // Perfect elastic expansion physics
            const elasticFactor = 1 - Math.pow(1 - normalizedDistance, 2.2);
            scale = 1 + (elasticFactor * 0.1); // Professional 10% for expansion

            // Perfect scale config for expansion direction
            const scaleConfig = {
              type: 'vertical' as const,
              direction: side === 'bottom' ? 'up' as const : 'down' as const,
              origin: side === 'bottom' ? 'center bottom' : 'center top',
              axis: 'scaleY' as const
            };

            setDragState({
              isDragging: true,
              offset,
              progress: Math.min(progress, 1),
              scale,
              scaleConfig,
              realTimeHeight: newHeight,
              startTime: ref.startTime,
              lastY: currentY,
              velocity: avgVelocity
            });
            return;
          }
        } else if (mode === 'minimized') {
          // Minimized: allow growth to dock size
          const maxGrowth = heights.dock - currentModeHeight;
          const growAmount = Math.min(openingAmount, maxGrowth);
          newHeight = currentModeHeight + growAmount;
        } else {
          // Professional wrong-direction elastic feedback with proper transform origin
          const maxDistance = currentModeHeight * 0.3;
          const normalizedDistance = Math.min(openingAmount / maxDistance, 1);

          // Perfect elastic physics for wrong direction
          const elasticFactor = 1 - Math.pow(1 - normalizedDistance, 2.4);
          scale = 1 + (elasticFactor * 0.05); // Subtle 5% for wrong direction

          // Perfect scale config for wrong direction feedback
          const scaleConfig = {
            type: 'vertical' as const,
            direction: side === 'bottom' ? 'up' as const : 'down' as const,
            origin: side === 'bottom' ? 'center bottom' : 'center top',
            axis: 'scaleY' as const
          };

          setDragState({
            isDragging: true,
            offset,
            progress: Math.min(progress, 1),
            scale,
            scaleConfig,
            realTimeHeight: newHeight,
            startTime: ref.startTime,
            lastY: currentY,
            velocity: avgVelocity
          });
          return;
        }
      }
      
      setDragState({
        isDragging: true,
        offset,
        progress: Math.min(progress, 1),
        scale,
        scaleConfig: scale !== 1 ? {
          type: 'vertical' as const,
          direction: side === 'bottom' ? 'down' as const : 'up' as const,
          origin: side === 'bottom' ? 'center bottom' : 'center top',
          axis: 'scaleY' as const
        } : null,
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
      setDragState({ isDragging: false, offset: 0, progress: 0, scale: 1, scaleConfig: null, realTimeHeight: null, startTime: 0, lastY: 0, velocity: 0 });

      // Perfect state reset with all tracking variables
      ref.startY = 0;
      ref.startX = 0;
      ref.lastY = 0;
      ref.startTime = 0;
      ref.lastFrameTime = 0;
      ref.committed = false;
      ref.velocities = [];
      ref.target = null;
      ref.heightAtStart = 0;
      ref.isInteractiveTarget = false;
      ref.startedInBody = false;
      ref.gestureIgnored = false;
      ref.startRelativeY = 0;
      ref.startRelativeX = 0;
      ref.panelStartTop = 0;
      ref.panelStartLeft = 0;
      ref.scrollStartTop = 0;
      ref.scrollStartHeight = 0;
      // Advanced tracking resets
      ref.lastTimeDragPrevented = 0;
      ref.wasBeyondThePoint = false;
      ref.hasTextSelection = false;
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

  // Advanced scroll management with momentum preservation
  useEffect(() => {
    if (!shouldRender) return;
    const panel = panelRef.current;
    const drawerBody = panel?.querySelector('.drawer__body[data-scrollable="true"]') as HTMLElement;
    if (!drawerBody) return;

    // Always enable smooth scrolling with conflict resolution
    drawerBody.style.overflow = 'auto';
    drawerBody.style.touchAction = 'pan-y';
    drawerBody.style.overscrollBehavior = 'contain';
    drawerBody.style.webkitOverflowScrolling = 'touch';
    drawerBody.style.scrollBehavior = 'auto'; // Auto for instant response

    // Hardware acceleration and momentum preservation
    drawerBody.style.willChange = 'scroll-position';
    drawerBody.style.transform = 'translateZ(0)';
    drawerBody.style.backfaceVisibility = 'hidden';

    // Use requestAnimationFrame for smooth performance
    let rafId: number | null = null;
    function scheduleUpdate() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        // Smooth scroll position updates handled by native browser
      });
    }

    drawerBody.addEventListener('scroll', scheduleUpdate, { passive: true });

    return () => {
      drawerBody.removeEventListener('scroll', scheduleUpdate);
      if (rafId) cancelAnimationFrame(rafId);
    };
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
      
      // Professional scale transform with perfect directional awareness
      if (dragState.scale !== 1 && dragState.scaleConfig) {
        transforms.push(`${dragState.scaleConfig.axis}(${dragState.scale})`);
      }
      
      return transforms.length > 0 ? transforms.join(' ') : undefined;
    })(),
    transformOrigin: dragState.scale !== 1 && dragState.scaleConfig
      ? `${dragState.scaleConfig.origin} !important`
      : undefined,
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


