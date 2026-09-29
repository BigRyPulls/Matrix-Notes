import type { ProgramDefinition, ProgramExerciseDef, ProgramWeekDef } from '../../types';

type ExSpec = Omit<ProgramExerciseDef, 'id'>;
type DaySpec = { id: string; name: string; exercises: ExSpec[] };

function makeWeek(variant: string, week: number, days: DaySpec[]): ProgramWeekDef {
  return {
    label: `Week ${week}`,
    sessions: days.map((d) => ({
      id: `${variant}-w${week}-${d.id}`,
      name: d.name,
      exercises: d.exercises.map((e, i) => ({
        ...e,
        id: `${variant}-w${week}-${d.id}-e${i + 1}`,
      })),
    })),
  };
}

// ─── Heavy Lower (Monday) ────────────────────────────────────

const heavyLowerDay: DaySpec = {
  id: 'mon',
  name: 'Monday — Heavy Lower',
  exercises: [
    {
      name: 'Squat',
      sets: 0,
      reps: '',
      percentageOf: 'Squat',
      setDefinitions: [
        { percentage: 77.5, reps: '6' },
        { percentage: 77.5, reps: '6' },
        { percentage: 77.5, reps: '6' },
      ],
    },
    {
      name: 'Deadlift',
      sets: 0,
      reps: '',
      percentageOf: 'Deadlift',
      setDefinitions: [
        { percentage: 77.5, reps: '6' },
        { percentage: 77.5, reps: '6' },
      ],
    },
    {
      name: 'Leg Curl',
      sets: 3,
      reps: '8-12',
    },
    {
      name: 'Leg Extension',
      sets: 3,
      reps: '8-12',
    },
  ],
};

// ─── Heavy Upper (Tuesday) ───────────────────────────────────

const heavyUpperDay: DaySpec = {
  id: 'tue',
  name: 'Tuesday — Heavy Upper',
  exercises: [
    {
      name: 'Bench Press',
      sets: 0,
      reps: '',
      percentageOf: 'Bench Press',
      setDefinitions: [
        { percentage: 77.5, reps: '6' },
        { percentage: 77.5, reps: '6' },
        { percentage: 77.5, reps: '6' },
      ],
    },
    {
      name: 'Barbell Row',
      sets: 3,
      reps: '6',
    },
    {
      name: 'Seated Dumbbell Press',
      sets: 3,
      reps: '6-12',
    },
    {
      name: 'Lat Pulldown',
      sets: 3,
      reps: '6-12',
    },
    {
      name: 'Dumbbell Curl',
      sets: 3,
      reps: '8-12',
    },
    {
      name: 'Tricep Pushdown',
      sets: 3,
      reps: '8-12',
    },
  ],
};

// ─── Control Lower (Thursday) ────────────────────────────────

const controlLowerDay: DaySpec = {
  id: 'thu',
  name: 'Thursday — Control Lower',
  exercises: [
    {
      name: 'Pause Squat',
      sets: 0,
      reps: '',
      percentageOf: 'Squat',
      setDefinitions: [
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
      ],
    },
    {
      name: 'Pause Front Squat',
      sets: 3,
      reps: '8-12',
    },
    {
      name: 'Pause Deadlift',
      sets: 0,
      reps: '',
      percentageOf: 'Deadlift',
      setDefinitions: [
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
      ],
    },
    {
      name: 'Deficit Deadlift',
      sets: 3,
      reps: '8-12',
    },
  ],
};

// ─── Control Upper (Friday) ──────────────────────────────────

const controlUpperDay: DaySpec = {
  id: 'fri',
  name: 'Friday — Control Upper',
  exercises: [
    {
      name: 'Spoto Press',
      sets: 0,
      reps: '',
      percentageOf: 'Bench Press',
      setDefinitions: [
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
        { percentage: 60, reps: '4' },
      ],
    },
    {
      name: 'Pause Dumbbell Row',
      sets: 6,
      reps: '4',
    },
    {
      name: 'Seated DB Press',
      sets: 4,
      reps: '6-10',
    },
    {
      name: 'Weighted Pullup',
      sets: 4,
      reps: '6-10',
    },
    {
      name: 'JM Press',
      sets: 3,
      reps: '8-12',
    },
    {
      name: 'Dumbbell Curl',
      sets: 3,
      reps: '8-12',
    },
  ],
};

// ─── Power Lower (Thursday) ──────────────────────────────────

const powerLowerDay: DaySpec = {
  id: 'thu',
  name: 'Thursday — Power Lower',
  exercises: [
    {
      name: 'Explosive Squat',
      sets: 6,
      reps: '2',
    },
    {
      name: 'Speed Deadlift',
      sets: 6,
      reps: '2',
    },
    {
      name: 'Box Jump',
      sets: 4,
      reps: '4',
    },
    {
      name: 'Broad Jump',
      sets: 4,
      reps: '4',
    },
  ],
};

// ─── Hypertrophy Lower (Thursday) ────────────────────────────

const hypertrophyLowerDay: DaySpec = {
  id: 'thu',
  name: 'Thursday — Hypertrophy Lower',
  exercises: [
    {
      name: 'Back Squat',
      sets: 0,
      reps: '',
      percentageOf: 'Squat',
      setDefinitions: [
        { percentage: 65, reps: '8' },
        { percentage: 65, reps: '8' },
        { percentage: 65, reps: '8' },
        { percentage: 65, reps: '8' },
        { percentage: 65, reps: '8' },
      ],
    },
    {
      name: 'Romanian Deadlift',
      sets: 3,
      reps: '8',
    },
    {
      name: 'Hamstring Curl',
      sets: 3,
      reps: '12',
    },
    {
      name: 'Calf Raise',
      sets: 5,
      reps: '15',
    },
    {
      name: 'Leg Extension',
      sets: 4,
      reps: '8-12',
    },
    {
      name: 'Walking Lunge',
      sets: 4,
      reps: '8-12',
    },
  ],
};

// ─── Hypertrophy Upper (Friday) ──────────────────────────────

const hypertrophyUpperDay: DaySpec = {
  id: 'fri',
  name: 'Friday — Hypertrophy Upper',
  exercises: [
    {
      name: 'Dumbbell Bench Press',
      sets: 4,
      reps: '8',
    },
    {
      name: 'Incline Dumbbell Press',
      sets: 4,
      reps: '8',
    },
    {
      name: 'Seated Cable Row',
      sets: 4,
      reps: '8',
    },
    {
      name: 'Lat Pulldown',
      sets: 4,
      reps: '8',
    },
    {
      name: 'Seated Dumbbell Press',
      sets: 3,
      reps: '10',
    },
    {
      name: 'Dumbbell Curl',
      sets: 3,
      reps: '10',
    },
    {
      name: 'Tricep Pushdown',
      sets: 3,
      reps: '10',
    },
  ],
};

// ─── 4-Day variant factory ───────────────────────────────────

function make4DayVariant(
  variant: string,
  thursdayDay: DaySpec,
  fridayDay: DaySpec,
): ProgramWeekDef[] {
  return [1, 2, 3, 4, 5, 6].map((w) =>
    makeWeek(variant, w, [heavyLowerDay, heavyUpperDay, thursdayDay, fridayDay]),
  );
}

// ─── 3-Day variant factory ───────────────────────────────────

function make3DayVariant(): ProgramWeekDef[] {
  return [1, 2, 3, 4, 5, 6].map((w) => {
    const fridayDay = w % 2 === 1 ? controlLowerDay : controlUpperDay;
    return makeWeek('3day', w, [
      { ...heavyLowerDay, id: 'mon' },
      { ...heavyUpperDay, id: 'wed', name: 'Wednesday — Heavy Upper' },
      { ...fridayDay, id: 'fri' },
    ]);
  });
}

export const CANDITO_LINEAR: ProgramDefinition = {
  id: 'candito-linear',
  name: 'Candito Linear Program',
  description:
    'A linear progression program by Jonnie Candito. 4 days/week (Mon/Tue/Thu/Fri) with fixed heavy upper/lower days and variant-specific lighter days. Start main lifts at ~77.5% of 1RM. Progress by ~5 lb/week. Control variant recommended.',
  liftInputs: ['Squat', 'Bench Press', 'Deadlift'],
  accessoryOptions: {},
  weeks: [],
  variants: [
    {
      id: 'control',
      label: 'Control (recommended) — Paused lifts, technique focus. Best for most lifters.',
      weeks: make4DayVariant('control', controlLowerDay, controlUpperDay),
    },
    {
      id: 'power',
      label: 'Power — Explosive/band work for CNS and speed. Reuses Control upper day.',
      weeks: make4DayVariant('power', powerLowerDay, controlUpperDay),
    },
    {
      id: 'hypertrophy',
      label: 'Hypertrophy — Higher volume, bodybuilding-style 5×8-12. Great for size.',
      weeks: make4DayVariant('hypertrophy', hypertrophyLowerDay, hypertrophyUpperDay),
    },
    {
      id: '3-day',
      label: '3-Day — Mon/Wed/Fri. Alternates lower/upper variation weekly. Control default.',
      weeks: make3DayVariant(),
    },
  ],
};
