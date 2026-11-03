import type { Source } from '../types';

/**
 * Plastic families by Resin Identification Code (the number in the triangle).
 * Used for "Field finds": anything the scanner recognises that isn't one of our full Specimen Files.
 * The AI only names the item and guesses its family; every fact shown comes from this sourced table.
 */
export type MaterialId = 'PET' | 'HDPE' | 'PVC' | 'LDPE' | 'PP' | 'PS' | 'OTHER' | 'MULTILAYER' | 'NONE' | 'UNKNOWN';

export interface Material {
  id: MaterialId;
  code: string; // what to look for on the item
  name: string;
  oftenIn: string;
  note: string;
  sources: Source[];
}

const ASTM: Source = { label: 'ASTM International, Resin Identification Code standard (ASTM D7611)', url: 'https://newsroom.astm.org/node/3040/printable/print' };
const USES: Source = { label: 'Carroll County, Maryland, Recycling: plastic codes and common uses', url: 'https://www.carrollcountymd.gov/media/3284/plastic-codes.pdf' };
const NUMBER_NOTE = 'The number tells you the material, not whether your town recycles it. Check your local recycling rules.';

export const MATERIALS: Record<MaterialId, Material> = {
  PET: { id: 'PET', code: '♳ 1', name: 'PET (polyethylene terephthalate)', oftenIn: 'Drink bottles, food jars and trays, some clear packaging.', note: NUMBER_NOTE, sources: [ASTM, USES] },
  HDPE: { id: 'HDPE', code: '♴ 2', name: 'HDPE (high-density polyethylene)', oftenIn: 'Milk and juice jugs, detergent and shampoo bottles, some tubs.', note: NUMBER_NOTE, sources: [ASTM, USES] },
  PVC: { id: 'PVC', code: '♵ 3', name: 'PVC (polyvinyl chloride)', oftenIn: 'Pipes, flooring and siding, some squeezable bottles and films.', note: NUMBER_NOTE, sources: [ASTM, USES] },
  LDPE: { id: 'LDPE', code: '♶ 4', name: 'LDPE (low-density polyethylene)', oftenIn: 'Plastic bags, six-pack rings, tubing, squeezable bottles.', note: NUMBER_NOTE, sources: [ASTM, USES] },
  PP: { id: 'PP', code: '♷ 5', name: 'PP (polypropylene)', oftenIn: 'Bottle caps, microwavable tubs and lids, straws, some takeout containers.', note: NUMBER_NOTE, sources: [ASTM, USES] },
  PS: { id: 'PS', code: '♸ 6', name: 'PS (polystyrene)', oftenIn: 'Foam cups and trays, plastic cutlery, some clear rigid packaging.', note: NUMBER_NOTE, sources: [ASTM, USES] },
  OTHER: { id: 'OTHER', code: '♹ 7', name: 'Other plastics', oftenIn: 'Everything else: acrylic, nylon, polycarbonate, PLA and mixed plastics.', note: NUMBER_NOTE, sources: [ASTM, USES] },
  MULTILAYER: { id: 'MULTILAYER', code: 'often ♹ 7 or none', name: 'Layered materials', oftenIn: 'Items made of fused layers, like plastic-lined paper or metallised film. Layers are hard to separate, which makes them harder to recycle.', note: NUMBER_NOTE, sources: [ASTM, USES] },
  NONE: { id: 'NONE', code: '—', name: 'Probably not plastic', oftenIn: 'The scanner thinks this is mostly glass, metal, paper, wood or fabric. Look closely: many items still hide plastic in a cap, lining or label.', note: 'A great find anyway: choosing items without plastic is the point.', sources: [] },
  UNKNOWN: { id: 'UNKNOWN', code: 'look for a number in a triangle', name: 'Plastic, type unknown', oftenIn: 'The scanner can’t tell which plastic this is from the photo.', note: 'Turn it over: the number in the small triangle tells you the family.', sources: [ASTM] },
};

export const isMaterialId = (v: unknown): v is MaterialId => typeof v === 'string' && v in MATERIALS;
