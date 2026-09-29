export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  type: 'major' | 'minor' | 'hotfix';
  items: string[];
}

export interface HotfixEntry {
  version: string;
  date: string;
  number: number;
  description: string;
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.5.0',
    date: '2026-07-26',
    title: 'Drag to Reorder, Double-Click Calendar & Quality-of-Life Improvements',
    type: 'minor',
    items: [
      'Drag to reorder exercises — long-press an exercise block to enter drag mode, then move it up or down to rearrange',
      'Double-click a day on the calendar to directly open that day\'s workout',
      'Auto-select text on input focus — weight, reps, exercise name: tap once and all text is selected for instant replacement',
      'Manual session timer start — "Start" button next to the timer for sessions that were copied or template-based',
      'Auto-scroll to the last logged set when opening an active workout',
      'Copy-to-Today exercise ordering fixed — new exercises now appear at the bottom where they belong',
      'Trash icon replaces the ⋮ menu on exercise blocks',
      'Exercise history now shows the full date including year',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-07-22',
    title: 'Program Creator — Full Custom Program Builder',
    type: 'minor',
    items: [
      'Full-screen Program Creator accessible from the Programs screen',
      'Add weeks (with custom labels), sessions within weeks, and exercises within sessions',
      'Each exercise defines name, sets, reps, and optional notes',
      'Edit/delete at every level with confirmation dialogs',
      'Custom programs saved to localStorage and appear alongside built-in programs',
      'Custom programs can be deleted from the program list',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-07-22',
    title: 'Session Timer, Copy to Today & Muscle Group Indicators',
    type: 'minor',
    items: [
      'Copy to Today — merge any past workout into today via the ⋮ menu',
      'Session timer auto-starts on first logged set, displays in header, survives phone sleep',
      'End Workout button stops the timer and marks the session complete',
      'Muscle group indicators on calendar with green-only patterns',
      'Rest timer alarm sound + notification when time is up',
      'Create exercises inline when searching in the Add Exercise picker',
      'Performance: batch IndexedDB reads for calendar muscle groups (was N+1 per exercise)',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-21',
    title: 'Programs, Graphs Overhaul & Exercise Mapping',
    type: 'minor',
    items: [
      'Training programs system with 6 built-in programs (Candito, 5/3/1, Reddit PPL, Soviet Peaking)',
      'Per-set tickable checkboxes that log to today\'s workout in real-time',
      'Exercise mapping wizard during program setup — match program exercises to library exercises or create new ones',
      'Graphs overhaul — chart types (1RM, e1RM, Max Weight, Volume), time ranges, clickable data points with session detail',
      'Weight/reps edits persist as drafts across navigation',
      'Bug fixes: tick state survives re-entry, chart re-renders on type change, empty exercises cleaned up automatically',
    ],
  },
];

export const HOTFIXES: HotfixEntry[] = [];
