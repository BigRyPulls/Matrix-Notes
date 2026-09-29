import type {
  ProgramConfig,
  ProgramDefinition,
  ProgramExerciseDef,
  ProgramSessionDef,
  ProgramWeekDef,
  Exercise,
} from '../types';
import { BUILT_IN_PROGRAMS } from '../data/programs';
import { createId } from '../utils/id';
import { toDateKey } from '../utils/date';
import { findRememberedMapping } from './exercise-mapping.service';

const STORAGE_KEY = 'matrixnotes_programs';
const CUSTOM_KEY = 'matrixnotes_custom_programs';

function loadConfigs(): ProgramConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProgramConfig[];
  } catch (e) {
    console.warn('Failed to load program configs from localStorage', e);
    return [];
  }
}

function saveConfigs(configs: ProgramConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function getActiveConfigs(): ProgramConfig[] {
  return loadConfigs();
}

export function getConfig(id: string): ProgramConfig | undefined {
  return loadConfigs().find((c) => c.id === id);
}

export function getEffectiveWeeks(program: ProgramDefinition, config: ProgramConfig): ProgramWeekDef[] {
  if (config.variantId && program.variants) {
    const variant = program.variants.find((v) => v.id === config.variantId);
    if (variant) return variant.weeks;
  }
  return program.weeks;
}

export function getAllProgramExerciseNames(program: ProgramDefinition): string[] {
  const names = new Set<string>();
  const walk = (weeks: ProgramWeekDef[]) => {
    for (const w of weeks) {
      for (const s of w.sessions) {
        for (const e of s.exercises) {
          if (!e.accessoryGroup) names.add(e.name);
        }
      }
    }
  };
  walk(program.weeks);
  for (const v of program.variants ?? []) walk(v.weeks);
  return [...names];
}

export function getVariantLabel(program: ProgramDefinition, config: ProgramConfig): string | undefined {
  if (!config.variantId || !program.variants) return undefined;
  return program.variants.find((v) => v.id === config.variantId)?.label;
}

export function getSessionById(
  program: ProgramDefinition,
  config: ProgramConfig,
  sessionId: string,
): { session: ProgramSessionDef; weekIndex: number } | undefined {
  const weeks = getEffectiveWeeks(program, config);
  for (let wi = 0; wi < weeks.length; wi++) {
    const found = weeks[wi]!.sessions.find((s) => s.id === sessionId);
    if (found) return { session: found, weekIndex: wi };
  }
  return undefined;
}

export function createProgramConfig(
  programId: string,
  lifts: Array<{ exerciseName: string; oneRM: number }>,
  accessoryChoices: Array<{ groupName: string; chosenExercise: string }>,
  variantId?: string,
  exerciseMappings?: Record<string, string>,
  naSlots?: Record<string, boolean>,
): ProgramConfig {
  const prog = getProgramById(programId);
  const config: ProgramConfig = {
    id: createId('pgcfg'),
    programId,
    programName: prog?.name ?? programId,
    startDate: toDateKey(),
    weightUnit: 'kg',
    lifts: lifts.map((l) => ({ exerciseName: l.exerciseName, oneRM: l.oneRM })),
    accessoryChoices: accessoryChoices.map((a) => ({ groupName: a.groupName, chosenExercise: a.chosenExercise })),
    variantId,
    exerciseMappings,
    naSlots,
    sessionProgress: {},
    exerciseProgress: {},
    extraExercises: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const configs = loadConfigs();
  configs.push(config);
  saveConfigs(configs);
  return config;
}

export function updateConfig(id: string, patch: Partial<ProgramConfig>): ProgramConfig | undefined {
  const configs = loadConfigs();
  const idx = configs.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const existing = configs[idx]!;
  configs[idx] = { ...existing, ...patch, id: existing.id, updatedAt: Date.now() };
  saveConfigs(configs);
  return configs[idx];
}

export function toggleSessionDone(configId: string, sessionId: string): ProgramConfig | undefined {
  const config = loadConfigs().find((c) => c.id === configId);
  if (!config) return undefined;
  const key = `session_${sessionId}`;
  const next = { ...config, sessionProgress: { ...config.sessionProgress } };
  next.sessionProgress[key] = !next.sessionProgress[key];
  return updateConfig(configId, { sessionProgress: next.sessionProgress });
}

export function isSessionDone(config: ProgramConfig, sessionId: string): boolean {
  return !!config.sessionProgress[`session_${sessionId}`];
}

export function isExerciseDone(config: ProgramConfig, exerciseId: string): boolean {
  return !!config.exerciseProgress[`ex_${exerciseId}`];
}

export function calcWorkingWeight(oneRM: number, percentage: number, roundTo = 2.5): number {
  const raw = oneRM * (percentage / 100);
  return Math.round(raw / roundTo) * roundTo;
}

// ── Scored exercise matching ──

/** Canonical aliases: normalized names that are semantically equivalent. */
const ALIASES: Record<string, string[]> = {
  'squat': ['back squat', 'barbell back squat'],
  'bench press': ['barbell bench press', 'flat barbell bench press'],
  'deadlift': ['conventional deadlift'],
};

/** Variations that are materially different and should NOT auto-match. */
const KNOWN_NON_EQUIVALENTS: Record<string, string[]> = {
  'squat': ['hack squat', 'front squat', 'goblet squat', 'leg press'],
  'deadlift': ['romanian deadlift', 'stiff legged deadlift', 'sumo deadlift', 'deficit deadlift', 'snatch grip deadlift', 'pause deadlift'],
  'bench press': ['incline bench press', 'decline bench press', 'close grip bench press', 'dumbbell bench press'],
};

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[#()]/g, '').trim();
}

/**
 * Scored exercise matching. Returns a scored list of candidates sorted by relevance.
 * Score tiers:
 *   100 = exact normalized name match
 *   90  = known canonical alias
 *   70  = starts with the query (strong prefix match)
 *   50  = contains the query (but query is substantial — >4 chars)
 *   0   = not a match
 *
 * Known non-equivalents (e.g. Squat → Hack Squat) are excluded.
 */
export function scoreExerciseMatch(
  programLabel: string,
  lib: Exercise[],
): Array<{ exercise: Exercise; score: number }> {
  const norm = normalizeForMatch(programLabel);
  const nonEquivalents = new Set(
    (KNOWN_NON_EQUIVALENTS[norm] ?? []).map((n) => normalizeForMatch(n))
  );
  const aliasTargets = ALIASES[norm] ?? [];

  const results: Array<{ exercise: Exercise; score: number }> = [];

  for (const ex of lib) {
    const exNorm = normalizeForMatch(ex.name);

    // Exclude known non-equivalents
    if (nonEquivalents.has(exNorm)) continue;

    // Exact match
    if (exNorm === norm) {
      results.push({ exercise: ex, score: 100 });
      continue;
    }

    // Canonical alias match
    if (aliasTargets.includes(exNorm)) {
      results.push({ exercise: ex, score: 90 });
      continue;
    }

    // Strong prefix match (exercise name starts with the program label)
    if (exNorm.startsWith(norm + ' ') || exNorm === norm) {
      results.push({ exercise: ex, score: 70 });
      continue;
    }

    // Reverse: program label starts with exercise name (e.g. "Squat" matches "Squat")
    if (norm.startsWith(exNorm) && exNorm.length > 3) {
      results.push({ exercise: ex, score: 60 });
      continue;
    }

    // Substantial substring match (only if the query is long enough to be meaningful)
    if (norm.length > 4 && exNorm.includes(norm)) {
      results.push({ exercise: ex, score: 50 });
      continue;
    }
  }

  results.sort((a, b) => b.score - a.score || a.exercise.name.length - b.exercise.name.length);
  return results;
}

/**
 * Best single match for a program label. Returns the exercise name if score >= 70 (high confidence).
 */
export function suggestMatch(
  programLabel: string,
  lib: Exercise[],
  config?: ProgramConfig,
  programId?: string,
): { name: string; id: string; score: number } | undefined {
  // 1. Check persistent remembered mapping first
  if (config && programId) {
    const remembered = findRememberedMapping(programLabel, programId, (exerciseId) =>
      lib.some((e) => e.id === exerciseId)
    );
    if (remembered) {
      const ex = lib.find((e) => e.id === remembered.exerciseId);
      if (ex) return { name: ex.name, id: ex.id, score: 100 };
    }
  }

  // 2. Scored matching
  const scored = scoreExerciseMatch(programLabel, lib);
  if (scored.length > 0 && scored[0]!.score >= 70) {
    return { name: scored[0]!.exercise.name, id: scored[0]!.exercise.id, score: scored[0]!.score };
  }

  return undefined;
}

// ── Exercise resolution ──

export interface ResolvedSet {
  weight: string;
  weightValue: number | null;
  reps: string;
  note?: string;
}

export interface ResolvedExercise {
  id: string;
  name: string;
  exerciseId: string | null;
  sets: ResolvedSet[];
  summary: string;
  note?: string;
  done: boolean;
  isNA: boolean;
}

function calcWeight(
  oneRM: number,
  percentage: number,
  unit: string,
  trainingMaxPct = 100,
): { display: string; value: number } {
  const roundTo = unit === 'kg' ? 2.5 : 5;
  const raw = oneRM * (trainingMaxPct / 100) * (percentage / 100);
  const w = Math.round(raw / roundTo) * roundTo;
  return { display: `${w} ${unit}`, value: w };
}

/**
 * Resolve a single exercise def to a resolved exercise name and optional Exercise.id.
 * Uses: accessoryChoice → exerciseMappings → name fallback.
 * exerciseMap is an optional pre-loaded lookup from exerciseRepo.getAll().
 */
export function resolveExerciseDef(
  ex: ProgramExerciseDef,
  config: ProgramConfig,
  exerciseMap?: Map<string, { id: string; name: string }>,
): { name: string; exerciseId: string | null } {
  if (ex.accessoryGroup) {
    const choice = config.accessoryChoices.find((a) => a.groupName === ex.accessoryGroup);
    if (choice) {
      // Check if we have a remembered mapping for this accessory group
      const mappedId = config.exerciseMappings?.[ex.accessoryGroup];
      if (mappedId && exerciseMap) {
        const libEx = exerciseMap.get(mappedId);
        if (libEx) return { name: libEx.name, exerciseId: libEx.id };
      }
      // Try to find by name in the exercise map
      if (exerciseMap) {
        for (const libEx of exerciseMap.values()) {
          if (libEx.name.toLowerCase() === choice.chosenExercise.toLowerCase()) {
            return { name: libEx.name, exerciseId: libEx.id };
          }
        }
      }
      return { name: choice.chosenExercise, exerciseId: mappedId ?? null };
    }
    return { name: ex.name, exerciseId: null };
  }
  // For non-accessory exercises, check exerciseMappings
  const mappedValue = config.exerciseMappings?.[ex.name];
  if (mappedValue && exerciseMap) {
    // Try as Exercise.id first
    const byId = exerciseMap.get(mappedValue);
    if (byId) return { name: byId.name, exerciseId: byId.id };
    // Fallback: try as exercise name (backward compat)
    for (const libEx of exerciseMap.values()) {
      if (libEx.name.toLowerCase() === mappedValue.toLowerCase()) {
        return { name: libEx.name, exerciseId: libEx.id };
      }
    }
  }
  return { name: mappedValue ?? ex.name, exerciseId: null };
}

export function resolveSessionExercises(
  program: ProgramDefinition,
  config: ProgramConfig,
  session: ProgramSessionDef,
  exerciseMap?: Map<string, { id: string; name: string }>,
): ResolvedExercise[] {
  const unit = config.weightUnit;
  const tmPct = program.trainingMaxPct ?? 100;
  const oneRMFor = (name: string): number | undefined => {
    const lift = config.lifts.find((l) => l.exerciseName.toLowerCase() === name.toLowerCase());
    return lift?.oneRM;
  };

  const result: ResolvedExercise[] = [];

  for (const ex of session.exercises) {
    // Check N/A slot
    const isNA = !!(config.naSlots && config.naSlots[ex.id]);
    if (isNA) {
      result.push({
        id: ex.id,
        name: ex.optionalLabel ?? ex.name,
        exerciseId: null,
        sets: [],
        summary: 'N/A — not performed',
        note: ex.note,
        done: true,
        isNA: true,
      });
      continue;
    }

    const resolved = resolveExerciseDef(ex, config, exerciseMap);

    const sets: ResolvedSet[] = [];
    let summary = '';

    if (ex.setDefinitions && ex.setDefinitions.length > 0) {
      const oneRM = ex.percentageOf ? oneRMFor(ex.percentageOf) : undefined;
      for (const sd of ex.setDefinitions) {
        const cw = (oneRM && sd.percentage)
          ? calcWeight(oneRM, sd.percentage, unit, tmPct)
          : null;
        sets.push({
          weight: cw?.display ?? '',
          weightValue: cw?.value ?? null,
          reps: sd.reps,
          note: sd.note,
        });
      }
    } else {
      for (let i = 0; i < ex.sets; i++) {
        sets.push({ weight: '', weightValue: null, reps: ex.reps });
      }
    }

    // Build summary string
    if (ex.setDefinitions && ex.setDefinitions.length > 0) {
      const oneRM = ex.percentageOf ? oneRMFor(ex.percentageOf) : undefined;
      const parts = ex.setDefinitions.map((sd) => {
        const cw = (oneRM && sd.percentage) ? calcWeight(oneRM, sd.percentage, unit, tmPct) : null;
        const hasWarmUp = ex.name.toLowerCase().includes('warm up');
        const label = hasWarmUp ? '' : cw ? `${cw.display}` : '';
        return label ? `${sd.reps} @ ${label}` : `${sd.reps}`;
      });
      summary = parts.join(', ');
    } else if (ex.percentageOf) {
      summary = `${ex.sets}×${ex.reps}`;
    } else {
      summary = `${ex.sets ? ex.sets + '×' : ''}${ex.reps}`;
    }

    result.push({
      id: ex.id,
      name: resolved.name,
      exerciseId: resolved.exerciseId,
      sets,
      summary,
      note: ex.note,
      done: isExerciseDone(config, ex.id),
      isNA: false,
    });
  }

  // Append extra exercises for this session
  const extras = config.extraExercises?.[session.id];
  if (extras && extras.length > 0) {
    for (const extra of extras) {
      result.push({
        id: `extra_${extra.exerciseId}`,
        name: '', // will be resolved by caller using exerciseId
        exerciseId: extra.exerciseId,
        sets: Array.from({ length: extra.sets }, () => ({ weight: '', weightValue: null, reps: extra.reps })),
        summary: `${extra.sets}×${extra.reps}`,
        done: false,
        isNA: false,
      });
    }
  }

  return result;
}

export function deleteConfig(id: string): void {
  const configs = loadConfigs().filter((c) => c.id !== id);
  saveConfigs(configs);
}

// ── Custom program storage ──

function loadCustomPrograms(): ProgramDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProgramDefinition[];
  } catch {
    return [];
  }
}

function saveCustomPrograms(defs: ProgramDefinition[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(defs));
}

export function listCustomPrograms(): ProgramDefinition[] {
  return loadCustomPrograms();
}

export function createCustomProgram(name: string, description: string, weeks: ProgramWeekDef[]): ProgramDefinition {
  const prog: ProgramDefinition = {
    id: createId('pgdef'),
    name,
    description,
    weeks,
    liftInputs: [],
    accessoryOptions: {},
  };
  const all = loadCustomPrograms();
  all.push(prog);
  saveCustomPrograms(all);
  return prog;
}

export function updateCustomProgram(def: ProgramDefinition): void {
  const all = loadCustomPrograms();
  const idx = all.findIndex((p) => p.id === def.id);
  if (idx !== -1) {
    all[idx] = def;
    saveCustomPrograms(all);
  }
}

export function deleteCustomProgram(id: string): void {
  saveCustomPrograms(loadCustomPrograms().filter((p) => p.id !== id));
}

// ── Merged program queries (built-in + custom) ──

export function listPrograms(): ProgramDefinition[] {
  return [...BUILT_IN_PROGRAMS, ...loadCustomPrograms()];
}

export function getProgramById(id: string): ProgramDefinition | undefined {
  return BUILT_IN_PROGRAMS.find((p) => p.id === id) ?? loadCustomPrograms().find((p) => p.id === id);
}
