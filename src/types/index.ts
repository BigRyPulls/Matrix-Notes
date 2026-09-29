/** Domain types for MatrixNotes. UI never talks to IndexedDB directly. */

export type ExerciseMetric = 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance' | 'weight_duration';

export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi' | 'm';
export type MeasurementType =
  | 'bodyweight'
  | 'bodyfat'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'bicep'
  | 'thigh'
  | 'neck'
  | 'calf'
  | 'custom';

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Exercise {
  id: string;
  name: string;
  categoryId: string;
  metric: ExerciseMetric;
  notes: string;
  isCustom: boolean;
  /** Soft archive — hidden from pickers unless showing archived */
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Workout {
  id: string;
  /** Local calendar date YYYY-MM-DD */
  date: string;
  name: string;
  notes: string;
  startedAt: number | null;
  finishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  sortOrder: number;
  notes: string;
  /** Snapshot of exercise name at time of logging (rename-safe) */
  exerciseName: string;
  metric: ExerciseMetric;
  createdAt: number;
  updatedAt: number;
}

/** Provenance linking a logged set back to the program that prescribed it. */
export interface ProgramSource {
  configId: string;
  programId: string;
  sessionId: string;
  exerciseDefId: string;
  setIndex: number;
}

export interface SetEntry {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  distance: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isPR: boolean;
  notes: string;
  /** Links this set to the program/config/session/exercise/set that prescribed it. */
  programSource?: ProgramSource;
  completedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  name: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface TemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  sortOrder: number;
  notes: string;
  targetSets: number;
  targetReps: number | null;
  targetWeight: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Measurement {
  id: string;
  type: MeasurementType;
  label: string;
  value: number;
  unit: string;
  date: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  kind: 'max_weight' | 'max_reps' | 'max_volume' | 'max_distance' | 'best_duration';
  value: number;
  secondaryValue: number | null;
  setId: string;
  workoutId: string;
  achievedAt: number;
  date: string;
}

export interface AppSettings {
  id: 'settings';
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  restTimerSec: number;
  autoStartRest: boolean;
  showWarmupSets: boolean;
  defaultWorkoutName: string;
  weekStartsOn: 0 | 1;
  haptics: boolean;
  confirmDelete: boolean;
  keepScreenOn: boolean;
  /** First time this device opened the app (ms). Used for 7-day backup cadence. */
  firstOpenAt: number;
  /** User saw the first-run backup education overlay */
  backupIntroSeen: boolean;
  /** Last successful JSON export (ms), 0 if never */
  lastBackupAt: number;
  /** Last time we showed (or dismissed) the 7-day reminder (ms), 0 if never */
  lastBackupPromptAt: number;
  updatedAt: number;
}

export interface UndoAction {
  id: string;
  label: string;
  createdAt: number;
  /** Serialized inverse operations */
  payload: string;
}

/** Full portable export shape */
export interface ExportPayload {
  version: 2;
  exportedAt: number;
  app: 'MatrixNotes';
  categories: Category[];
  exercises: Exercise[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sets: SetEntry[];
  templates: Template[];
  templateExercises: TemplateExercise[];
  measurements: Measurement[];
  personalRecords: PersonalRecord[];
  settings: AppSettings;
  /** Program definitions stored in localStorage (custom programs) — added in v2 */
  customPrograms?: string;
  /** Active program configs stored in localStorage — added in v2 */
  programConfigs?: string;
  /** Persistent exercise mapping memory — added in v2 */
  exerciseMappings?: string;
}

export type ScreenId =
  | 'home'
  | 'workout'
  | 'exercises'
  | 'exercise-detail'
  | 'history'
  | 'graphs'
  | 'settings'
  | 'measurements'
  | 'templates'
  | 'pick-exercise'
  | 'edit-exercise'
  | 'workout-list'
  | 'programs'
  | 'program-detail'
  | 'program-session'
  | 'program-creator'
  | 'release-notes';

export interface RouteState {
  screen: ScreenId;
  params: Record<string, string>;
}

export interface DaySummary {
  date: string;
  workoutCount: number;
  setCount: number;
  exerciseCount: number;
  workoutIds: string[];
}

export interface ExerciseHistoryEntry {
  set: SetEntry;
  workout: Workout;
  workoutExercise: WorkoutExercise;
}

export interface PRCheckResult {
  isPR: boolean;
  kind: PersonalRecord['kind'] | null;
  previousValue: number | null;
}

export interface ProgramLiftConfig {
  exerciseName: string;
  oneRM: number;
}

export interface AccessoryChoice {
  groupName: string;
  chosenExercise: string;
}

/** Persistent exercise mapping memory — remembers user's manual exercise assignments across program instances. */
export interface ExerciseMappingEntry {
  /** Normalized key (lowercase exercise name from program) */
  key: string;
  /** Resolved library Exercise.id */
  exerciseId: string;
  /** Exercise name as fallback if the exercise is deleted */
  exerciseName: string;
  /** Scope: "global" for common lifts (Squat, Bench, Deadlift), program id for specific ones */
  scope: string;
  updatedAt: number;
}

export interface ProgramVariant {
  id: string;
  label: string;
  weeks: ProgramWeekDef[];
}

export interface ProgramConfig {
  id: string;
  programId: string;
  programName: string;
  startDate: string;
  weightUnit: WeightUnit;
  lifts: ProgramLiftConfig[];
  accessoryChoices: AccessoryChoice[];
  variantId?: string;
  sessionProgress: Record<string, boolean>;
  exerciseProgress: Record<string, boolean>;
  exerciseMappings?: Record<string, string>;
  /** User-added extra exercises per session. Key is sessionId. */
  extraExercises?: Record<string, Array<{ exerciseId: string; sets: number; reps: string }>>;
  /** N/A slot flags. Key is exerciseDefId, value true means slot is disabled. */
  naSlots?: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
}

export interface ProgramSetDef {
  percentage?: number;
  reps: string;
  note?: string;
}

export interface ProgramExerciseDef {
  id: string;
  name: string;
  sets: number;
  reps: string;
  percentageOf?: string;
  /** Per-set definitions (percentage + reps per set). When present, used instead of flat sets/reps/percentageOf. */
  setDefinitions?: ProgramSetDef[];
  accessoryGroup?: string;
  /** For exercises like "Optional Exercise 1" that need a label */
  optionalLabel?: string;
  note?: string;
  /** Whether this slot can be set to N/A (not performed) */
  naAllowed?: boolean;
  /** Role of this exercise in the program: primary, variation, accessory, optional */
  role?: 'primary' | 'variation' | 'accessory' | 'optional';
  /** Body/session context hint: helps group exercises in setup UI */
  context?: 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'full body';
}

export interface ProgramSessionDef {
  id: string;
  name: string;
  /** Session-level notes (e.g. back-off squat instructions) */
  notes?: string[];
  exercises: ProgramExerciseDef[];
}

export interface ProgramWeekDef {
  label: string;
  sessions: ProgramSessionDef[];
}

// ── Program setup group types ──

/** A fixed accessory slot within a setup group — user picks one exercise from a predefined list. */
export interface SetupFixedSlot {
  type: 'fixed';
  /** Stable id (matches accessoryGroup key in the program definition) */
  id: string;
  /** Display label, e.g. "Horizontal Pull" */
  label: string;
  /** Predefined exercise options the user can choose from */
  options: string[];
  /** Default selection (index into options, or exercise name) */
  default?: string;
  /** Whether this slot can be set to N/A / not performed */
  naAllowed?: boolean;
  /** Taxonomy hint for the exercise picker (used for recommendations, not layout) */
  context?: 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'full body';
}

/** A repeatable optional exercise slot — user can add zero or more exercises. */
export interface SetupOptionalSlot {
  type: 'optional';
  /** Stable id, e.g. "optional-upper", "optional-lower" */
  id: string;
  /** Display label, e.g. "Optional Upper Exercises" */
  label: string;
  /** Placeholder text for the add button */
  addLabel: string;
  /** Taxonomy hint for the exercise picker recommendations */
  context?: 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'full body';
  /** Which sessions these optional exercises apply to (for display/info only) */
  appliesTo?: string;
}

export type SetupSlot = SetupFixedSlot | SetupOptionalSlot;

/** A setup group defines a section of the program setup wizard. */
export interface ProgramSetupGroup {
  /** Stable id */
  id: string;
  /** Display heading, e.g. "Upper Body", "Lower Body" */
  label: string;
  /** Optional description/help text shown under the heading */
  description?: string;
  /** Ordering (lower = shown first) */
  order: number;
  /** The configurable exercise slots in this group */
  slots: SetupSlot[];
}

// ── End program setup group types ──

export interface ProgramDefinition {
  id: string;
  name: string;
  description: string;
  weeks: ProgramWeekDef[];
  variants?: ProgramVariant[];
  accessoryOptions: Record<string, string[]>;
  liftInputs: string[];
  trainingMaxPct?: number;
  /** Explicit setup structure for the program wizard. Drives the wizard layout. */
  setupGroups?: ProgramSetupGroup[];
}
