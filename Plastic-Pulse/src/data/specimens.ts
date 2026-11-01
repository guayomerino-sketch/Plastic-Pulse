import type { Specimen } from '../types';

// Sourced facts only. Persistence figures are estimates; we say so in the UI.
// When a reliable figure does not exist, we write "Unknown" and turn it into an open question.

const NOAA = {
  label: 'NOAA / Woods Hole Sea Grant, "How long until it\'s gone?" (persistence estimates)',
  url: 'https://marinedebris.noaa.gov/',
};
const OECD = {
  label: 'OECD Global Plastics Outlook, 2022 (only ~9% of plastic waste is recycled)',
  url: 'https://www.oecd.org/environment/plastics/',
};

export const SPECIMENS: Specimen[] = [
  {
    id: 'pet-bottle',
    name: 'Single-use water bottle',
    polymer: 'Polyethylene terephthalate (PET)',
    resinCode: '#1',
    massGrams: 12,
    massLabel: '10–14 g (500 ml bottle)',
    persistence: '~450 years (estimate)',
    threat: 'High',
    fieldNotes:
      'Sunlight and waves break it into microplastics instead of making it disappear. Sea turtles and seabirds swallow fragments they mistake for food.',
    frontierScience:
      'In 2016, researchers in Japan found a bacterium, Ideonella sakaiensis, that makes an enzyme (PETase) able to break PET down. Labs are now engineering faster versions.',
    openQuestion: 'Could your school turn its own PET bottles into 3D-printer filament?',
    sources: [NOAA, OECD, { label: 'Yoshida et al., Science, 2016 (PETase)' }],
  },
  {
    id: 'bottle-cap',
    name: 'Bottle cap',
    polymer: 'Polypropylene (PP) or HDPE',
    resinCode: '#5 / #2',
    massGrams: 2,
    massLabel: '~2–3 g',
    persistence: 'Unknown (no reliable estimate)',
    threat: 'High',
    fieldNotes:
      'Caps are small and often separated from bottles, so many sorting systems lose them. They are among the most common items found in beach cleanups.',
    frontierScience:
      'Community makerspaces use open-source shredders and small injection machines to turn sorted caps into tiles, beads and new parts.',
    openQuestion: 'What could your community make from 1,000 bottle caps?',
    sources: [OECD, { label: 'Ocean Conservancy, International Coastal Cleanup reports' }],
  },
  {
    id: 'grocery-bag',
    name: 'Plastic grocery bag',
    polymer: 'High-density polyethylene (HDPE)',
    resinCode: '#2',
    massGrams: 6,
    massLabel: '~5–8 g',
    persistence: '~20 years (estimate)',
    threat: 'High',
    fieldNotes:
      'Light enough to blow out of bins and trucks. In water, a drifting bag can look like a jellyfish to a sea turtle.',
    frontierScience:
      'Some researchers are studying wax-worm saliva enzymes that appear to oxidize polyethylene at room temperature.',
    openQuestion: 'Why do bag bans work in some cities and not others? What would you measure?',
    sources: [NOAA, OECD],
  },
  {
    id: 'straw',
    name: 'Plastic straw',
    polymer: 'Polypropylene (PP)',
    resinCode: '#5',
    massGrams: 0.5,
    massLabel: 'under 1 g',
    persistence: 'Unknown (no reliable estimate)',
    threat: 'Moderate',
    fieldNotes:
      'Tiny by weight but used in huge numbers, and too light and small for most recycling machines to catch.',
    frontierScience:
      'Alternatives range from paper and pasta to seaweed-based straws. Each has trade-offs in cost, durability and accessibility for people who need straws.',
    openQuestion: 'How would you design a straw policy that also works for people with disabilities?',
    sources: [OECD],
  },
  {
    id: 'foam-cup',
    name: 'Foam cup',
    polymer: 'Expanded polystyrene (EPS)',
    resinCode: '#6',
    massGrams: 3,
    massLabel: '~2–4 g',
    persistence: '~50 years (estimate)',
    threat: 'Severe',
    fieldNotes:
      'Foam crumbles into small beads that float and spread fast. It is rarely accepted in curbside recycling.',
    frontierScience:
      'Researchers have found mealworms that can digest polystyrene foam, and are studying the gut microbes that make it possible.',
    openQuestion: 'Which places near you still use foam, and what would make them switch?',
    sources: [NOAA, OECD],
  },
  {
    id: 'six-pack-rings',
    name: 'Six-pack rings',
    polymer: 'Low-density polyethylene (LDPE)',
    resinCode: '#4',
    massGrams: null,
    massLabel: 'a few grams',
    persistence: '~400 years (estimate)',
    threat: 'Severe',
    fieldNotes: 'Rings can loop around the necks and bodies of birds, turtles and fish as they grow.',
    frontierScience: 'Some brewers now use cardboard toppers or compostable rings instead.',
    openQuestion: 'If you designed a multi-pack holder from scratch, what would it be made of?',
    sources: [NOAA],
  },
  {
    id: 'ghost-net',
    name: 'Fishing line & ghost nets',
    polymer: 'Nylon / polyethylene',
    resinCode: '—',
    massGrams: null,
    massLabel: 'varies',
    persistence: '~600 years for fishing line (estimate)',
    threat: 'Severe',
    fieldNotes:
      'Lost fishing gear keeps "fishing" for years, trapping whales, seals and turtles. Nets make up a large share of the mass of the Great Pacific Garbage Patch.',
    frontierScience: 'Some companies recover old nets and recycle the nylon into carpets, skateboards and clothing.',
    openQuestion: 'How could fishers be rewarded for bringing lost gear back to port?',
    sources: [NOAA, { label: 'Lebreton et al., Scientific Reports, 2018 (Great Pacific Garbage Patch)' }],
  },
];

export const QUICK_LOG_IDS = ['pet-bottle', 'bottle-cap', 'grocery-bag', 'straw', 'foam-cup'];

export const specimenById = (id: string): Specimen =>
  SPECIMENS.find((s) => s.id === id) ?? SPECIMENS[0];
