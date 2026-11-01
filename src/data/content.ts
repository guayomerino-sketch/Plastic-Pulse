import type { Idea, LabChallenge, Rank, WeeklyProblem } from '../types';

export const GOODALL_QUOTE =
  'What you do makes a difference, and you have to decide what kind of difference you want to make.';

export const SONG = {
  title: 'Won’t You Be a Hero?',
  credit: 'Grecia & Eduardo Merino',
  vocal: '/anthem.mp3',
  instrumental: '/instrumental.mp3',
};

// Lines from "Won't You Be a Hero?" © 2019 Grecia & Eduardo Merino.
export const HOPEFUL_LINES = [
  'Won’t you be a hero for this place of wonder?',
  'Spring is a symphony and should never be silent.',
  'Won’t you be a hero for flora and fauna?',
  'The young generation, leading change to bring green again.',
  'Won’t you be a hero for all forms of life?',
  'Money can’t build nature’s designs.',
];
export const SORROW_LINES = [
  'She needs a shield. She needs your love.',
  'Won’t you be a hero for this weeping planet?',
];

export const RANKS: Rank[] = [
  { id: 'observer', name: 'Observer', minXp: 0 },
  { id: 'researcher', name: 'Field Researcher', minXp: 500 },
  { id: 'analyst', name: 'Analyst', minXp: 2000, requirement: 'lab', requirementLabel: 'Complete 1 Lab Challenge' },
  { id: 'innovator', name: 'Innovator', minXp: 4000, requirement: 'idea', requirementLabel: 'Pitch 1 idea in the Solution Lab' },
  { id: 'guardian', name: 'Biome Guardian', minXp: 8000 },
];

export const XP = { refuse: 40, reuse: 25, use: 5, labDay: 20, idea: 150, vote: 2 } as const;

export const CHALLENGES: LabChallenge[] = [
  {
    id: 'bottle-week',
    title: 'A week without single-use bottles',
    days: 7,
    xp: 300,
    question: 'How many single-use bottles do I actually go through, and what makes skipping them hard?',
    method: 'Carry a refillable bottle. Each day, log every moment you were offered a plastic bottle and what you chose.',
    hypothesisPrompt: 'I think the hardest moment will be…',
  },
  {
    id: 'cap-census',
    title: 'Cap census',
    days: 5,
    xp: 250,
    question: 'How many bottle caps end up in one place (your cafeteria, gym or home) in a school week?',
    method: 'Pick one spot. Each day, count the caps you find there and note where they came from. Wear gloves.',
    hypothesisPrompt: 'I predict we will count about…',
  },
  {
    id: 'where-does-it-go',
    title: 'Where does my #5 go?',
    days: 3,
    xp: 200,
    question: 'What really happens to #5 plastic in my city?',
    method: 'Day 1: find your city’s recycling rules online. Day 2: ask a store or school staff member. Day 3: compare what you learned.',
    hypothesisPrompt: 'I think my city does this with #5 plastic…',
  },
];

export const PROBLEMS: WeeklyProblem[] = [
  { id: 'caps', title: 'Bottle caps slip through most recycling.', brief: 'What could they become instead?', specimenId: 'bottle-cap' },
  { id: 'fountains', title: 'People buy bottles because refill spots are hard to find.', brief: 'How would you make refilling easier than buying?', specimenId: 'pet-bottle' },
  { id: 'foam', title: 'Foam food containers are cheap, so they stay.', brief: 'What would make a local restaurant switch?', specimenId: 'foam-cup' },
  { id: 'nets', title: 'Lost fishing nets keep trapping animals for years.', brief: 'How could lost gear find its way back to port?', specimenId: 'ghost-net' },
];

/** The problem of the week rotates every 7 days. */
export function currentProblem(now = Date.now()): WeeklyProblem {
  const week = Math.floor(now / (7 * 24 * 3600 * 1000));
  return PROBLEMS[week % PROBLEMS.length];
}

// Clearly-labelled examples shown until the community backend exists (Phase 2).
export const EXAMPLE_IDEAS: Idea[] = [
  { id: 'ex1', problemId: 'caps', title: 'Cap-collection drive feeding a makerspace shredder', problem: 'Caps are small, so many sorting systems lose them.', idea: 'Collection boxes in the cafeteria; a local makerspace turns caps into tiles for school benches.', evidence: 'Example: a club counted 1,140 caps in 2 weeks from one cafeteria.', createdAt: 0, mine: false, votes: 128, example: true },
  { id: 'ex2', problemId: 'fountains', title: 'Map the hidden water fountains on campus', problem: 'Students buy bottles because refill spots are hard to find.', idea: 'A shared map and signs on every refill station.', evidence: 'Example: 46 "bought a bottle" logs near the gym in one month.', createdAt: 0, mine: false, votes: 94, example: true },
  { id: 'ex3', problemId: 'caps', title: 'Swap sauce packets for pump stations', problem: 'Packets can’t be recycled and end up as litter.', idea: 'Ask the cafeteria to try pumps for one month and measure waste.', evidence: 'Example: in a survey of 80 students, 71% said they would use pumps.', createdAt: 0, mine: false, votes: 61, example: true },
];

// The weekly shared goal. Live totals come from Firestore (src/services/sharedGoal.ts).
// targetGrams must match firestore.rules.
export const SHARED_GOAL = { label: 'Refuse 50 kg of plastic together', targetGrams: 50000 };
