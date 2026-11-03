// Core game types for Plastic Pulse.

export type ChoiceAction = 'refuse' | 'reuse' | 'use';

export type ScreenId = 'pulse' | 'scan' | 'lab' | 'solutions' | 'world' | 'feedback' | 'book' | 'you';

export type ThreatLevel = 'Moderate' | 'High' | 'Severe';

/** How surprising or hard to find a specimen is. Hidden = most people don't know it contains plastic. */
export type Rarity = 'Common' | 'Rare' | 'Hidden';

/** Collection sets in the Specimen Book, grouped by where players meet the plastic. */
export type SetId = 'takeout' | 'home' | 'wardrobe' | 'ocean';

/** Procedural 3D model drawn for the specimen's hologram. */
export type ShapeId =
  | 'bottle' | 'cap' | 'bag' | 'straw' | 'foam-cup' | 'rings' | 'net'
  | 'coffee-cup' | 'chip-bag' | 'toothbrush' | 'wipe' | 'tea-bag' | 'shirt' | 'glitter' | 'gum';

export interface Source {
  label: string;
  url?: string;
}

/** One plastic "specimen". Every number here must come from a cited source. */
export interface Specimen {
  id: string;
  name: string;
  short: string; // chip label on the Pulse screen
  rarity: Rarity;
  set: SetId;
  shape: ShapeId;
  polymer: string;
  resinCode: string; // e.g. "#1"
  massGrams: number | null; // typical mass used for impact math; null = not tracked
  massLabel: string; // human-readable, e.g. "10–14 g (500 ml bottle)"
  persistence: string; // e.g. "~450 years (estimate)" or "Unknown"
  threat: ThreatLevel;
  fieldNotes: string;
  frontierScience: string;
  openQuestion: string;
  sources: Source[];
}

export interface LogEntry {
  specimenId: string;
  action: ChoiceAction;
  at: number; // epoch ms
}

export interface LabChallenge {
  id: string;
  title: string;
  days: number;
  xp: number;
  question: string;
  method: string;
  hypothesisPrompt: string;
}

export interface LabProgress {
  hypothesis: string;
  done: boolean[];
  conclusion: string;
  completed: boolean;
}

export interface WeeklyProblem {
  id: string;
  title: string;
  brief: string;
  specimenId: string;
}

export interface Idea {
  id: string;
  problemId: string;
  title: string;
  problem: string;
  idea: string;
  evidence: string;
  createdAt: number;
  mine: boolean;
  votes: number;
  example?: boolean;
}

export interface Rank {
  id: string;
  name: string;
  minXp: number;
  requirement?: 'lab' | 'idea';
  requirementLabel?: string;
}

export interface GameState {
  version: 1;
  xp: number;
  health: number; // 0..1 biome health
  streakDays: number;
  lastActiveDay: string | null; // YYYY-MM-DD
  logs: LogEntry[];
  lab: Record<string, LabProgress>;
  activeChallengeId: string;
  ideas: Idea[];
  votedIdeaIds: string[];
  musicOn: boolean;
  studied: string[]; // specimens opened in Scan or the Book; logged ones count as discovered too
  discovery: { specimenId: string; at: number } | null; // the latest first discovery, shown as a reveal
  group: GroupRef | null; // the class (or, later, household) this player belongs to
}

export type GroupKind = 'class' | 'household';
export interface GroupRef { id: string; name: string; code: string; kind: GroupKind }
