import type { ExerciseMappingEntry } from '../types';

const STORAGE_KEY = 'matrixnotes_exercise_mappings';

/** Canonical aliases: normalized program labels → canonical key. */
const CANONICAL_ALIASES: Record<string, string> = {
  'squat': 'squat',
  'back squat': 'squat',
  'barbell back squat': 'squat',
  'bench press': 'bench press',
  'barbell bench press': 'bench press',
  'flat barbell bench press': 'bench press',
  'deadlift': 'deadlift',
  'conventional deadlift': 'deadlift',
};

/** Labels that are too generic to be globally scoped — should be scoped to the program. */
const GENERIC_LABELS = new Set([
  'main lift', 'primary exercise', 'optional exercise 1', 'optional exercise 2',
  'optional lower body', 'optional upper body', 'accessory', 'accessory 1', 'accessory 2',
  'upper back #1 (horizontal pull)', 'upper back #2 (vertical pull)', 'shoulder exercise',
  'optional lower body 1', 'optional lower body 2',
]);

function loadMappings(): ExerciseMappingEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ExerciseMappingEntry[];
  } catch {
    return [];
  }
}

function saveMappings(entries: ExerciseMappingEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[#()]/g, '').trim();
}

/** Check if a program label is generic enough to warrant program-scoped storage. */
function isGenericLabel(label: string): boolean {
  return GENERIC_LABELS.has(normalizeKey(label));
}

/** Get the canonical alias key for a label, if one exists. */
function getCanonicalKey(label: string): string | undefined {
  return CANONICAL_ALIASES[normalizeKey(label)];
}

/**
 * Look up a remembered exercise mapping.
 * Returns the Exercise.id if a remembered mapping exists and the exercise still exists in the library.
 */
export function findRememberedMapping(
  programLabel: string,
  programId: string,
  exerciseExistsFn: (id: string) => boolean,
): ExerciseMappingEntry | undefined {
  const entries = loadMappings();
  const norm = normalizeKey(programLabel);
  const canonical = getCanonicalKey(programLabel);
  const isGeneric = isGenericLabel(programLabel);

  // Try exact key match first (program-scoped or global)
  for (const entry of entries) {
    if (entry.key === norm || entry.key === canonical) {
      // For generic labels, only match within the same program scope or global
      if (isGeneric && entry.scope !== 'global' && entry.scope !== programId) continue;
      if (exerciseExistsFn(entry.exerciseId)) return entry;
      // Exercise was deleted — fall through to normal matching
    }
  }

  return undefined;
}

/**
 * Save a user's manual exercise mapping choice.
 * Called whenever the user manually uses Change/Assign in the wizard.
 */
export function saveMapping(
  programLabel: string,
  exerciseId: string,
  exerciseName: string,
  programId: string,
): void {
  const entries = loadMappings();
  const norm = normalizeKey(programLabel);
  const isGeneric = isGenericLabel(programLabel);
  const scope = isGeneric ? 'global' : programId;

  // Find existing entry for this key+scope
  const existing = entries.find((e) => e.key === norm && e.scope === scope);
  if (existing) {
    existing.exerciseId = exerciseId;
    existing.exerciseName = exerciseName;
    existing.updatedAt = Date.now();
  } else {
    entries.push({
      key: norm,
      exerciseId,
      exerciseName,
      scope,
      updatedAt: Date.now(),
    });
  }
  saveMappings(entries);
}

/**
 * Save an accessory choice as a mapping too (so future programs remember it).
 */
export function saveAccessoryMapping(
  groupName: string,
  exerciseId: string,
  exerciseName: string,
  programId: string,
): void {
  const entries = loadMappings();
  const norm = normalizeKey(groupName);
  const isGeneric = isGenericLabel(groupName);
  const scope = isGeneric ? 'global' : programId;

  const existing = entries.find((e) => e.key === norm && e.scope === scope);
  if (existing) {
    existing.exerciseId = exerciseId;
    existing.exerciseName = exerciseName;
    existing.updatedAt = Date.now();
  } else {
    entries.push({
      key: norm,
      exerciseId,
      exerciseName,
      scope,
      updatedAt: Date.now(),
    });
  }
  saveMappings(entries);
}

/** Get all saved mappings (for export). */
export function getAllMappings(): ExerciseMappingEntry[] {
  return loadMappings();
}

/** Restore mappings from an import. */
export function restoreMappings(entries: ExerciseMappingEntry[]): void {
  saveMappings(entries);
}
