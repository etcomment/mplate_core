import { create } from 'zustand';
import type { GuideLine } from '../core/smartGuides';

interface SmartGuidesStore {
  activeGuides: GuideLine[];
  setActiveGuides: (guides: GuideLine[]) => void;
  clearGuides: () => void;
}

export const useSmartGuidesStore = create<SmartGuidesStore>((set) => ({
  activeGuides: [],
  setActiveGuides: (guides) => set({ activeGuides: guides }),
  clearGuides: () => set({ activeGuides: [] }),
}));
