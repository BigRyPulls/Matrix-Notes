import type { ProgramDefinition } from '../../types';

export const SOVIET_PEAKING: ProgramDefinition = {
  id: 'soviet-peaking',
  name: 'Soviet Peaking Program',
  description:
    'A 6-week peaking program from The WeighTrainer (LiftVault). Peaks a single competition lift with 2 sessions/week (Light/Heavy). Volume descends and intensity ascends over 6 weeks, culminating in a projected 105% 1RM attempt in week 6.',
  liftInputs: ['Main Lift'],
  accessoryOptions: {},
  trainingMaxPct: 100,
  weeks: [
    // ─── WEEK 1 ──────────────────────────────────────────────────
    {
      label: 'Week 1',
      sessions: [
        {
          id: 'w1s1',
          name: 'Light Day',
          exercises: [
            {
              id: 'w1s1e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '6' },
                { percentage: 70, reps: '6' },
                { percentage: 70, reps: '6' },
                { percentage: 70, reps: '6' },
              ],
            },
          ],
        },
        {
          id: 'w1s2',
          name: 'Heavy Day',
          exercises: [
            {
              id: 'w1s2e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 80, reps: '5' },
                { percentage: 80, reps: '5' },
                { percentage: 80, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 65, reps: '8' },
                { percentage: 60, reps: 'AMRAP', note: 'to failure' },
              ],
            },
          ],
        },
      ],
    },

    // ─── WEEK 2 ──────────────────────────────────────────────────
    {
      label: 'Week 2',
      sessions: [
        {
          id: 'w2s1',
          name: 'Light Day',
          exercises: [
            {
              id: 'w2s1e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '6' },
                { percentage: 70, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 75, reps: '5' },
              ],
            },
          ],
        },
        {
          id: 'w2s2',
          name: 'Heavy Day',
          exercises: [
            {
              id: 'w2s2e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '4' },
                { percentage: 80, reps: '4' },
                { percentage: 85, reps: '4' },
                { percentage: 85, reps: '4' },
                { percentage: 85, reps: '4' },
                { percentage: 80, reps: '5' },
                { percentage: 70, reps: '8' },
              ],
            },
          ],
        },
      ],
    },

    // ─── WEEK 3 ──────────────────────────────────────────────────
    {
      label: 'Week 3',
      sessions: [
        {
          id: 'w3s1',
          name: 'Light Day',
          exercises: [
            {
              id: 'w3s1e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 70, reps: '4' },
                { percentage: 75, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 80, reps: '3' },
              ],
            },
          ],
        },
        {
          id: 'w3s2',
          name: 'Heavy Day',
          exercises: [
            {
              id: 'w3s2e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '4' },
                { percentage: 85, reps: '3' },
                { percentage: 90, reps: '3' },
                { percentage: 90, reps: '3' },
                { percentage: 80, reps: '5' },
                { percentage: 60, reps: 'AMRAP', note: 'to failure' },
              ],
            },
          ],
        },
      ],
    },

    // ─── WEEK 4 ──────────────────────────────────────────────────
    {
      label: 'Week 4',
      sessions: [
        {
          id: 'w4s1',
          name: 'Light Day',
          exercises: [
            {
              id: 'w4s1e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '4' },
                { percentage: 85, reps: '3' },
                { percentage: 85, reps: '3' },
              ],
            },
          ],
        },
        {
          id: 'w4s2',
          name: 'Heavy Day',
          exercises: [
            {
              id: 'w4s2e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '4' },
                { percentage: 85, reps: '2' },
                { percentage: 90, reps: '2' },
                { percentage: 95, reps: '2' },
                { percentage: 75, reps: 'AMRAP', note: 'to failure' },
              ],
            },
          ],
        },
      ],
    },

    // ─── WEEK 5 ──────────────────────────────────────────────────
    {
      label: 'Week 5',
      sessions: [
        {
          id: 'w5s1',
          name: 'Light Day',
          exercises: [
            {
              id: 'w5s1e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '5' },
                { percentage: 75, reps: '5' },
              ],
            },
          ],
        },
        {
          id: 'w5s2',
          name: 'Heavy Day',
          exercises: [
            {
              id: 'w5s2e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '3' },
                { percentage: 80, reps: '3' },
                { percentage: 85, reps: '2' },
              ],
            },
          ],
        },
      ],
    },

    // ─── WEEK 6 ──────────────────────────────────────────────────
    {
      label: 'Week 6',
      sessions: [
        {
          id: 'w6s1',
          name: 'Light Day',
          exercises: [
            {
              id: 'w6s1e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '3' },
                { percentage: 80, reps: '2' },
                { percentage: 80, reps: '2' },
              ],
            },
          ],
        },
        {
          id: 'w6s2',
          name: 'Heavy Day',
          exercises: [
            {
              id: 'w6s2e1',
              name: 'Main Lift',
              sets: 0,
              reps: '',
              percentageOf: 'Main Lift',
              setDefinitions: [
                { percentage: 45, reps: '8' },
                { percentage: 55, reps: '6' },
                { percentage: 65, reps: '5' },
                { percentage: 75, reps: '3' },
                { percentage: 85, reps: '2' },
                { percentage: 90, reps: '1' },
                { percentage: 95, reps: '1' },
                { percentage: 100, reps: '1' },
                { percentage: 105, reps: '1' },
              ],
            },
          ],
        },
      ],
    },
  ],
};
