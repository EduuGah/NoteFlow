import { create } from 'zustand';

interface ProfileState {
  level: number;
  xpTotal: number;
  xpCurrent: number;
  addXp: (amount: number) => void;
}

// Simple level progression: Level * 100 XP required for next level
const getXpRequiredForNextLevel = (level: number) => level * 100;

export const useProfileStore = create<ProfileState>((set) => ({
  level: 1,
  xpTotal: 0,
  xpCurrent: 0,
  addXp: (amount) => set((state) => {
    let newXpCurrent = state.xpCurrent + amount;
    let newXpTotal = state.xpTotal + amount;
    let newLevel = state.level;
    let xpRequired = getXpRequiredForNextLevel(newLevel);

    while (newXpCurrent >= xpRequired) {
      newXpCurrent -= xpRequired;
      newLevel += 1;
      xpRequired = getXpRequiredForNextLevel(newLevel);
    }

    return {
      level: newLevel,
      xpTotal: newXpTotal,
      xpCurrent: newXpCurrent,
    };
  }),
}));
