import type { ProgramDefinition } from '../../types';

export const FIVE_THREE_ONE_ORIGINAL: ProgramDefinition = {
  id: '531-original',
  name: '5/3/1 Original',
  description:
    'Jim Wendler\'s classic 5/3/1 program. 4 days/week: Overhead Press, Deadlift, Bench Press, Squat each on their own day. 4-week cycles with ascending intensity. Uses 90% Training Max (enter 1RM, program calculates from 90%).',
  liftInputs: ['Overhead Press', 'Deadlift', 'Bench Press', 'Squat'],
  accessoryOptions: {},
  trainingMaxPct: 90,
  weeks: [
    // ─── WEEK 1 ──────────────────────────────────────────────────
    {
      label: 'Week 1 — 5/3/1 (65%, 75%, 85%)',
      sessions: [
        {
          id: 'w1s1',
          name: 'Overhead Press',
          exercises: [
            {
              id: 'w1s1e1',
              name: 'Overhead Press',
              sets: 0,
              reps: '',
              percentageOf: 'Overhead Press',
              setDefinitions: [
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '5+' },
              ],
            },
            {
              id: 'w1s1e2',
              name: 'Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w1s1e3',
              name: 'Lat Pulldown',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w1s1e4',
              name: 'Dumbbell Row',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w1s2',
          name: 'Deadlift',
          exercises: [
            {
              id: 'w1s2e1',
              name: 'Deadlift',
              sets: 0,
              reps: '',
              percentageOf: 'Deadlift',
              setDefinitions: [
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '5+' },
              ],
            },
            {
              id: 'w1s2e2',
              name: 'Barbell Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w1s2e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w1s2e4',
              name: 'Back Extension',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
        {
          id: 'w1s3',
          name: 'Bench Press',
          exercises: [
            {
              id: 'w1s3e1',
              name: 'Bench Press',
              sets: 0,
              reps: '',
              percentageOf: 'Bench Press',
              setDefinitions: [
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '5+' },
              ],
            },
            {
              id: 'w1s3e2',
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w1s3e3',
              name: 'Seated Cable Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w1s3e4',
              name: 'Dumbbell Curl',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w1s4',
          name: 'Squat',
          exercises: [
            {
              id: 'w1s4e1',
              name: 'Squat',
              sets: 0,
              reps: '',
              percentageOf: 'Squat',
              setDefinitions: [
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '5+' },
              ],
            },
            {
              id: 'w1s4e2',
              name: 'Leg Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w1s4e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w1s4e4',
              name: 'Calf Raise',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
      ],
    },

    // ─── WEEK 2 ──────────────────────────────────────────────────
    {
      label: 'Week 2 — 5/3/1 (70%, 80%, 90%)',
      sessions: [
        {
          id: 'w2s1',
          name: 'Overhead Press',
          exercises: [
            {
              id: 'w2s1e1',
              name: 'Overhead Press',
              sets: 0,
              reps: '',
              percentageOf: 'Overhead Press',
              setDefinitions: [
                { percentage: 70, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 90, reps: '3+' },
              ],
            },
            {
              id: 'w2s1e2',
              name: 'Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w2s1e3',
              name: 'Lat Pulldown',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w2s1e4',
              name: 'Dumbbell Row',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w2s2',
          name: 'Deadlift',
          exercises: [
            {
              id: 'w2s2e1',
              name: 'Deadlift',
              sets: 0,
              reps: '',
              percentageOf: 'Deadlift',
              setDefinitions: [
                { percentage: 70, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 90, reps: '3+' },
              ],
            },
            {
              id: 'w2s2e2',
              name: 'Barbell Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w2s2e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w2s2e4',
              name: 'Back Extension',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
        {
          id: 'w2s3',
          name: 'Bench Press',
          exercises: [
            {
              id: 'w2s3e1',
              name: 'Bench Press',
              sets: 0,
              reps: '',
              percentageOf: 'Bench Press',
              setDefinitions: [
                { percentage: 70, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 90, reps: '3+' },
              ],
            },
            {
              id: 'w2s3e2',
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w2s3e3',
              name: 'Seated Cable Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w2s3e4',
              name: 'Dumbbell Curl',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w2s4',
          name: 'Squat',
          exercises: [
            {
              id: 'w2s4e1',
              name: 'Squat',
              sets: 0,
              reps: '',
              percentageOf: 'Squat',
              setDefinitions: [
                { percentage: 70, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 90, reps: '3+' },
              ],
            },
            {
              id: 'w2s4e2',
              name: 'Leg Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w2s4e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w2s4e4',
              name: 'Calf Raise',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
      ],
    },

    // ─── WEEK 3 ──────────────────────────────────────────────────
    {
      label: 'Week 3 — 5/3/1 (75%, 85%, 95%)',
      sessions: [
        {
          id: 'w3s1',
          name: 'Overhead Press',
          exercises: [
            {
              id: 'w3s1e1',
              name: 'Overhead Press',
              sets: 0,
              reps: '',
              percentageOf: 'Overhead Press',
              setDefinitions: [
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '3' },
                { percentage: 95, reps: '1+' },
              ],
            },
            {
              id: 'w3s1e2',
              name: 'Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w3s1e3',
              name: 'Lat Pulldown',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w3s1e4',
              name: 'Dumbbell Row',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w3s2',
          name: 'Deadlift',
          exercises: [
            {
              id: 'w3s2e1',
              name: 'Deadlift',
              sets: 0,
              reps: '',
              percentageOf: 'Deadlift',
              setDefinitions: [
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '3' },
                { percentage: 95, reps: '1+' },
              ],
            },
            {
              id: 'w3s2e2',
              name: 'Barbell Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w3s2e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w3s2e4',
              name: 'Back Extension',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
        {
          id: 'w3s3',
          name: 'Bench Press',
          exercises: [
            {
              id: 'w3s3e1',
              name: 'Bench Press',
              sets: 0,
              reps: '',
              percentageOf: 'Bench Press',
              setDefinitions: [
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '3' },
                { percentage: 95, reps: '1+' },
              ],
            },
            {
              id: 'w3s3e2',
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w3s3e3',
              name: 'Seated Cable Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w3s3e4',
              name: 'Dumbbell Curl',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w3s4',
          name: 'Squat',
          exercises: [
            {
              id: 'w3s4e1',
              name: 'Squat',
              sets: 0,
              reps: '',
              percentageOf: 'Squat',
              setDefinitions: [
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '3' },
                { percentage: 95, reps: '1+' },
              ],
            },
            {
              id: 'w3s4e2',
              name: 'Leg Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w3s4e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w3s4e4',
              name: 'Calf Raise',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
      ],
    },

    // ─── WEEK 4 (Deload) ────────────────────────────────────────
    {
      label: 'Week 4 — Deload (40%, 50%, 60%)',
      sessions: [
        {
          id: 'w4s1',
          name: 'Overhead Press',
          exercises: [
            {
              id: 'w4s1e1',
              name: 'Overhead Press',
              sets: 0,
              reps: '',
              percentageOf: 'Overhead Press',
              setDefinitions: [
                { percentage: 40, reps: '5' },
                { percentage: 50, reps: '5' },
                { percentage: 60, reps: '5' },
              ],
            },
            {
              id: 'w4s1e2',
              name: 'Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w4s1e3',
              name: 'Lat Pulldown',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w4s1e4',
              name: 'Dumbbell Row',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w4s2',
          name: 'Deadlift',
          exercises: [
            {
              id: 'w4s2e1',
              name: 'Deadlift',
              sets: 0,
              reps: '',
              percentageOf: 'Deadlift',
              setDefinitions: [
                { percentage: 40, reps: '5' },
                { percentage: 50, reps: '5' },
                { percentage: 60, reps: '5' },
              ],
            },
            {
              id: 'w4s2e2',
              name: 'Barbell Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w4s2e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w4s2e4',
              name: 'Back Extension',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
        {
          id: 'w4s3',
          name: 'Bench Press',
          exercises: [
            {
              id: 'w4s3e1',
              name: 'Bench Press',
              sets: 0,
              reps: '',
              percentageOf: 'Bench Press',
              setDefinitions: [
                { percentage: 40, reps: '5' },
                { percentage: 50, reps: '5' },
                { percentage: 60, reps: '5' },
              ],
            },
            {
              id: 'w4s3e2',
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w4s3e3',
              name: 'Seated Cable Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w4s3e4',
              name: 'Dumbbell Curl',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w4s4',
          name: 'Squat',
          exercises: [
            {
              id: 'w4s4e1',
              name: 'Squat',
              sets: 0,
              reps: '',
              percentageOf: 'Squat',
              setDefinitions: [
                { percentage: 40, reps: '5' },
                { percentage: 50, reps: '5' },
                { percentage: 60, reps: '5' },
              ],
            },
            {
              id: 'w4s4e2',
              name: 'Leg Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w4s4e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w4s4e4',
              name: 'Calf Raise',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
      ],
    },

    // ─── WEEK 5 (Cycle 2, Week 1) ───────────────────────────────
    {
      label: 'Week 5 — Cycle 2 / Week 1 (65%, 75%, 85%)',
      sessions: [
        {
          id: 'w5s1',
          name: 'Overhead Press',
          exercises: [
            {
              id: 'w5s1e1',
              name: 'Overhead Press',
              sets: 0,
              reps: '',
              percentageOf: 'Overhead Press',
              setDefinitions: [
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '5+' },
              ],
            },
            {
              id: 'w5s1e2',
              name: 'Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w5s1e3',
              name: 'Lat Pulldown',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w5s1e4',
              name: 'Dumbbell Row',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w5s2',
          name: 'Deadlift',
          exercises: [
            {
              id: 'w5s2e1',
              name: 'Deadlift',
              sets: 0,
              reps: '',
              percentageOf: 'Deadlift',
              setDefinitions: [
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '5+' },
              ],
            },
            {
              id: 'w5s2e2',
              name: 'Barbell Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w5s2e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w5s2e4',
              name: 'Back Extension',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
        {
          id: 'w5s3',
          name: 'Bench Press',
          exercises: [
            {
              id: 'w5s3e1',
              name: 'Bench Press',
              sets: 0,
              reps: '',
              percentageOf: 'Bench Press',
              setDefinitions: [
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '5+' },
              ],
            },
            {
              id: 'w5s3e2',
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w5s3e3',
              name: 'Seated Cable Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w5s3e4',
              name: 'Dumbbell Curl',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w5s4',
          name: 'Squat',
          exercises: [
            {
              id: 'w5s4e1',
              name: 'Squat',
              sets: 0,
              reps: '',
              percentageOf: 'Squat',
              setDefinitions: [
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 85, reps: '5+' },
              ],
            },
            {
              id: 'w5s4e2',
              name: 'Leg Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w5s4e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w5s4e4',
              name: 'Calf Raise',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
      ],
    },

    // ─── WEEK 6 (Cycle 2, Week 2) ───────────────────────────────
    {
      label: 'Week 6 — Cycle 2 / Week 2 (70%, 80%, 90%)',
      sessions: [
        {
          id: 'w6s1',
          name: 'Overhead Press',
          exercises: [
            {
              id: 'w6s1e1',
              name: 'Overhead Press',
              sets: 0,
              reps: '',
              percentageOf: 'Overhead Press',
              setDefinitions: [
                { percentage: 70, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 90, reps: '3+' },
              ],
            },
            {
              id: 'w6s1e2',
              name: 'Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w6s1e3',
              name: 'Lat Pulldown',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w6s1e4',
              name: 'Dumbbell Row',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w6s2',
          name: 'Deadlift',
          exercises: [
            {
              id: 'w6s2e1',
              name: 'Deadlift',
              sets: 0,
              reps: '',
              percentageOf: 'Deadlift',
              setDefinitions: [
                { percentage: 70, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 90, reps: '3+' },
              ],
            },
            {
              id: 'w6s2e2',
              name: 'Barbell Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w6s2e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w6s2e4',
              name: 'Back Extension',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
        {
          id: 'w6s3',
          name: 'Bench Press',
          exercises: [
            {
              id: 'w6s3e1',
              name: 'Bench Press',
              sets: 0,
              reps: '',
              percentageOf: 'Bench Press',
              setDefinitions: [
                { percentage: 70, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 90, reps: '3+' },
              ],
            },
            {
              id: 'w6s3e2',
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w6s3e3',
              name: 'Seated Cable Row',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w6s3e4',
              name: 'Dumbbell Curl',
              sets: 3,
              reps: '8-12',
            },
          ],
        },
        {
          id: 'w6s4',
          name: 'Squat',
          exercises: [
            {
              id: 'w6s4e1',
              name: 'Squat',
              sets: 0,
              reps: '',
              percentageOf: 'Squat',
              setDefinitions: [
                { percentage: 70, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 90, reps: '3+' },
              ],
            },
            {
              id: 'w6s4e2',
              name: 'Leg Press',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w6s4e3',
              name: 'Leg Curl',
              sets: 3,
              reps: '8-12',
            },
            {
              id: 'w6s4e4',
              name: 'Calf Raise',
              sets: 3,
              reps: '10-15',
            },
          ],
        },
      ],
    },
  ],
};
