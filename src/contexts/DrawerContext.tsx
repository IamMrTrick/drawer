'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DrawerSide = 'top' | 'bottom' | 'left' | 'right';

interface DrawerState {
  id: string;
  side: DrawerSide;
  isOpen: boolean;
}

interface DrawerContextType {
  drawers: DrawerState[];
  registerDrawer: (id: string, side: DrawerSide) => void;
  unregisterDrawer: (id: string) => void;
  openDrawer: (id: string, side: DrawerSide) => void;
  closeDrawer: (id: string) => void;
  closeAllDrawersOfSide: (side: DrawerSide) => void;
  getOpenDrawerOfSide: (side: DrawerSide) => DrawerState | null;
}

const DrawerContext = createContext<DrawerContextType | null>(null);

export function useDrawerContext() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawerContext must be used within a DrawerProvider');
  }
  return context;
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [drawers, setDrawers] = useState<DrawerState[]>([]);

  const registerDrawer = useCallback((id: string, side: DrawerSide) => {
    setDrawers(prev => {
      // Don't re-register if already exists
      if (prev.some(d => d.id === id)) return prev;
      return [...prev, { id, side, isOpen: false }];
    });
  }, []);

  const unregisterDrawer = useCallback((id: string) => {
    setDrawers(prev => prev.filter(d => d.id !== id));
  }, []);

  const openDrawer = useCallback((id: string, side: DrawerSide) => {
    setDrawers(prev => prev.map(drawer => {
      if (drawer.id === id) {
        return { ...drawer, isOpen: true };
      }
      // Close other drawers of the same side
      if (drawer.side === side && drawer.isOpen) {
        return { ...drawer, isOpen: false };
      }
      return drawer;
    }));
  }, []);

  const closeDrawer = useCallback((id: string) => {
    setDrawers(prev => prev.map(drawer => 
      drawer.id === id ? { ...drawer, isOpen: false } : drawer
    ));
  }, []);

  const closeAllDrawersOfSide = useCallback((side: DrawerSide) => {
    setDrawers(prev => prev.map(drawer => 
      drawer.side === side ? { ...drawer, isOpen: false } : drawer
    ));
  }, []);

  const getOpenDrawerOfSide = useCallback((side: DrawerSide) => {
    return drawers.find(d => d.side === side && d.isOpen) || null;
  }, [drawers]);

  return (
    <DrawerContext.Provider value={{
      drawers,
      registerDrawer,
      unregisterDrawer,
      openDrawer,
      closeDrawer,
      closeAllDrawersOfSide,
      getOpenDrawerOfSide
    }}>
      {children}
    </DrawerContext.Provider>
  );
}
