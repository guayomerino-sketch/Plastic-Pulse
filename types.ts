export interface PlasticItem {
  id: string;
  name: string;
  weightGrams: number;
  lifespanYears: number;
  icon: string; // Emoji or Lucide icon name
  description: string;
  commonBiome: 'Ocean' | 'Landfill' | 'Urban';
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface UserStats {
  itemsRefused: Record<string, number>;
  totalWeightSavedGrams: number;
  streakDays: number;
  level: number;
}

export interface GlobeState {
  pollutionLevel: number; // 0 to 1 (0 = clean, 1 = heavily polluted)
  rotationSpeed: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TRACKER = 'TRACKER',
  IMPACT = 'IMPACT',
  DESTINATIONS = 'DESTINATIONS',
  SOLUTIONS = 'SOLUTIONS',
  LEADERBOARD = 'LEADERBOARD',
  AI_INSIGHTS = 'AI_INSIGHTS'
}