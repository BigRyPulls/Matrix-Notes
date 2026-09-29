import type { ProgramDefinition } from '../../types';
import { CANDITO_6_WEEK } from './candito';
import { CANDITO_LINEAR } from './candito-linear';
import { SOVIET_PEAKING } from './sov-peaking';
import { REDDIT_PPL } from './reddit-ppl';
import { FIVE_THREE_ONE_ORIGINAL } from './531-original';
import { FIVE_THREE_ONE_BBB } from './531-bbb';

export const BUILT_IN_PROGRAMS: ProgramDefinition[] = [
  CANDITO_6_WEEK,
  CANDITO_LINEAR,
  SOVIET_PEAKING,
  REDDIT_PPL,
  FIVE_THREE_ONE_ORIGINAL,
  FIVE_THREE_ONE_BBB,
];

export function getProgramById(id: string): ProgramDefinition | undefined {
  return BUILT_IN_PROGRAMS.find((p) => p.id === id);
}

export function listPrograms(): ProgramDefinition[] {
  return BUILT_IN_PROGRAMS;
}
