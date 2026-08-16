export type DavelAccessory = 'chicken-plume' | 'slider-fins' | 'tyrant-horns'
  | 'firemouth-nozzle' | 'spinner-flywheels' | 'dj-headphones' | 'invoice-crown'
  | 'foreman-hardhat' | 'gear-ears' | 'jester-bells' | 'crook-top-hat';

const DAVEL_ACCESSORIES: readonly DavelAccessory[] = [
  'chicken-plume',
  'slider-fins',
  'tyrant-horns',
  'firemouth-nozzle',
  'spinner-flywheels',
  'dj-headphones',
  'invoice-crown',
  'foreman-hardhat',
  'gear-ears',
  'jester-bells',
  'crook-top-hat',
];

export function davelAccessory(robotId: number): DavelAccessory | null {
  return Number.isSafeInteger(robotId) ? DAVEL_ACCESSORIES[robotId] ?? null : null;
}
