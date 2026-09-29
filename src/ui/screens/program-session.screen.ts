import type { ProgramSource, WorkoutExercise } from '../../types';
import { el, clear } from '../../utils/dom';
import { exerciseRepo, setRepo, workoutExerciseRepo } from '../../storage/repositories';
import {
  getConfig,
  getProgramById,
  getSessionById,
  getEffectiveWeeks,
  resolveSessionExercises,
  toggleSessionDone,
  type ResolvedExercise,
} from '../../services/program.service';
import {
  getOrCreateWorkoutForDate,
  addExerciseToWorkout,
  addSet,
  deleteSet,
  updateSet,
  removeWorkoutExercise,
} from '../../services/workout.service';
import { toDateKey } from '../../utils/date';
import { router } from '../router';
import { toast } from '../toast';

type SetState = {
  done: boolean;
  weight: string;
  reps: string;
  setEntryId: string | null;
  weId: string | null;
};

function draftKey(configId: string, date: string): string {
  return `pg_draft_${configId}_${date}`;
}

function loadDrafts(configId: string, date: string): Record<string, { weight: string; reps: string }> {
  try {
    const raw = localStorage.getItem(draftKey(configId, date));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDraft(
  configId: string,
  date: string,
  exId: string,
  setIndex: number,
  weight: string,
  reps: string,
): void {
  const key = draftKey(configId, date);
  const all = loadDrafts(configId, date);
  all[`${exId}_${setIndex}`] = { weight, reps };
  localStorage.setItem(key, JSON.stringify(all));
}

function clearDraft(configId: string, date: string, exId: string, setIndex: number): void {
  const key = draftKey(configId, date);
  const all = loadDrafts(configId, date);
  delete all[`${exId}_${setIndex}`];
  localStorage.setItem(key, JSON.stringify(all));
}

function clearAllDrafts(configId: string, date: string): void {
  localStorage.removeItem(draftKey(configId, date));
}

export async function renderProgramSessionScreen(root: HTMLElement, params: Record<string, string>): Promise<void> {
  clear(root);
  const configId = params['configId'];
  const sessionId = params['sessionId'];
  if (!configId || !sessionId) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Session not found' }));
    return;
  }

  const config = getConfig(configId);
  if (!config) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Program not found' }));
    return;
  }

  const program = getProgramById(config.programId);
  if (!program) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Program definition not found' }));
    return;
  }

  const found = getSessionById(program, config, sessionId);
  if (!found) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Session not found' }));
    return;
  }

  const { session, weekIndex } = found;
  const weeks = getEffectiveWeeks(program, config);
  const today = toDateKey();
  const workout = await getOrCreateWorkoutForDate(today);

  const shell = el('div', { className: 'screen-enter stack' });
  root.appendChild(shell);

  // Load resolved exercises + existing workout data + saved drafts
  const allLibExercises = await exerciseRepo.getAll();
  const libMap = new Map(allLibExercises.map((e) => [e.id, e]));
  const resolved = resolveSessionExercises(program, config, session, libMap);

  // Resolve exercise names for extras that only have exerciseId
  for (const ex of resolved) {
    if (!ex.name && ex.exerciseId) {
      const lib = libMap.get(ex.exerciseId);
      ex.name = lib?.name ?? 'Unknown Exercise';
    }
  }

  const drafts = loadDrafts(configId, today);
  const setStates = new Map<string, SetState[]>();
  const weIdMap = new Map<string, string>(); // resolvedExerciseId -> WorkoutExercise.id

  const allWes = await workoutExerciseRepo.getByWorkout(workout.id);

  // ── PROVENANCE-BASED completion detection ──
  // For each resolved exercise, find its WorkoutExercise by exerciseId (not fuzzy name),
  // then check if any sets in the workout have matching programSource.
  for (const ex of resolved) {
    if (ex.isNA) {
      setStates.set(ex.id, []);
      continue;
    }

    // Find the WorkoutExercise by library Exercise.id (identity-based)
    let we: WorkoutExercise | undefined;
    if (ex.exerciseId) {
      we = allWes.find((w) => w.exerciseId === ex.exerciseId);
    }

    if (we) {
      weIdMap.set(ex.id, we.id);
    }

    const existingSets = we ? await setRepo.getByWorkoutExercise(we.id) : [];

    // Match sets by programSource.provenance, NOT by setNumber
    const states: SetState[] = ex.sets.map((s, i) => {
      // Look for a set that belongs to THIS program/config/session/exercise/setIndex
      const linked = existingSets.find((es) =>
        es.programSource &&
        es.programSource.configId === configId &&
        es.programSource.sessionId === sessionId &&
        es.programSource.exerciseDefId === ex.id &&
        es.programSource.setIndex === i
      );

      if (linked) {
        return {
          done: true,
          weight: String(linked.weight ?? ''),
          reps: String(linked.reps ?? ''),
          setEntryId: linked.id,
          weId: we!.id,
        };
      }

      // No linked set — this program set is not yet completed
      const draft = drafts[`${ex.id}_${i}`];
      return {
        done: false,
        weight: draft?.weight ?? (s.weightValue ? String(s.weightValue) : ''),
        reps: draft?.reps ?? s.reps,
        setEntryId: null,
        weId: null,
      };
    });
    setStates.set(ex.id, states);
  }

  /** Find or create a WorkoutExercise by resolved Exercise.id. */
  const findOrCreateWe = async (ex: ResolvedExercise): Promise<WorkoutExercise | null> => {
    // Check if we already mapped this
    const existingWeId = weIdMap.get(ex.id);
    if (existingWeId) {
      const existing = allWes.find((w) => w.id === existingWeId);
      if (existing) return existing;
    }

    // Try to find by exerciseId in today's workout
    if (ex.exerciseId) {
      const found = allWes.find((w) => w.exerciseId === ex.exerciseId);
      if (found) {
        weIdMap.set(ex.id, found.id);
        return found;
      }
    }

    // Create new WorkoutExercise
    if (!ex.exerciseId) return null;
    const created = await addExerciseToWorkout(workout.id, ex.exerciseId);
    allWes.push(created);
    weIdMap.set(ex.id, created.id);
    return created;
  };

  /** Build programSource metadata for a set. */
  const buildSource = (ex: ResolvedExercise, setIndex: number): ProgramSource => ({
    configId,
    programId: config.programId,
    sessionId,
    exerciseDefId: ex.id,
    setIndex,
  });

  const toggleSet = async (exId: string, setIndex: number) => {
    const states = setStates.get(exId);
    if (!states || setIndex >= states.length) return;
    const st = states[setIndex]!;
    const ex = resolved.find((e) => e.id === exId);
    if (!ex) return;

    if (st.done && st.setEntryId) {
      // ── Untick: delete only the program-linked set ──
      await deleteSet(st.setEntryId);
      st.done = false;
      st.setEntryId = null;
      const weId = st.weId;
      st.weId = null;
      const sd = ex.sets[setIndex];
      st.weight = sd?.weightValue ? String(sd.weightValue) : '';
      st.reps = sd?.reps ?? '';
      // Clean up empty exercise from workout
      if (weId) {
        const remaining = await setRepo.getByWorkoutExercise(weId);
        if (remaining.length === 0) await removeWorkoutExercise(weId);
      }
    } else if (!st.done) {
      // ── Tick: add a program-linked set ──
      const we = await findOrCreateWe(ex);
      if (!we) { toast('No matching exercise in library'); return; }
      const weight = parseFloat(st.weight) || null;
      const reps = parseInt(st.reps) || null;

      // Append with safe set number (don't use setIndex + 1 which may collide)
      const existingSets = await setRepo.getByWorkoutExercise(we.id);
      const nextSetNumber = existingSets.length > 0
        ? Math.max(...existingSets.map((s) => s.setNumber)) + 1
        : 1;

      const result = await addSet({
        workoutExerciseId: we.id,
        weight,
        reps,
        setNumber: nextSetNumber,
        programSource: buildSource(ex, setIndex),
      });
      st.done = true;
      st.setEntryId = result.set.id;
      st.weId = we.id;
      clearDraft(configId, today, exId, setIndex);
    }
    paint();
  };

  /** Toggle all sets for a single exercise (parent checkbox). */
  const toggleAllSetsForExercise = async (exId: string) => {
    const states = setStates.get(exId);
    if (!states) return;
    const ex = resolved.find((e) => e.id === exId);
    if (!ex || ex.isNA) return;

    const allDone = states.every((s) => s.done);

    if (allDone) {
      // ── Uncomplete: remove only program-linked sets for this exercise ──
      for (const st of states) {
        if (st.done && st.setEntryId) {
          // Only delete sets that have matching programSource
          const setEntry = await setRepo.getById(st.setEntryId);
          if (setEntry?.programSource &&
              setEntry.programSource.configId === configId &&
              setEntry.programSource.sessionId === sessionId &&
              setEntry.programSource.exerciseDefId === exId) {
            await deleteSet(st.setEntryId);
          }
          st.done = false;
          st.weId = null;
          const sd = ex.sets[states.indexOf(st)];
          st.weight = sd?.weightValue ? String(sd.weightValue) : '';
          st.reps = sd?.reps ?? '';
        }
      }
      // Clean up empty workout exercises
      const weId = weIdMap.get(exId);
      if (weId) {
        const remaining = await setRepo.getByWorkoutExercise(weId);
        if (remaining.length === 0) {
          await removeWorkoutExercise(weId);
          weIdMap.delete(exId);
        }
      }
    } else {
      // ── Complete: add all remaining sets ──
      const we = await findOrCreateWe(ex);
      if (!we) return;
      for (let i = 0; i < states.length; i++) {
        const st = states[i]!;
        if (st.done) continue;
        const weight = parseFloat(st.weight) || null;
        const reps = parseInt(st.reps) || null;

        const existingSets = await setRepo.getByWorkoutExercise(we.id);
        const nextSetNumber = existingSets.length > 0
          ? Math.max(...existingSets.map((s) => s.setNumber)) + 1
          : 1;

        const result = await addSet({
          workoutExerciseId: we.id,
          weight,
          reps,
          setNumber: nextSetNumber,
          programSource: buildSource(ex, i),
        });
        st.done = true;
        st.setEntryId = result.set.id;
        st.weId = we.id;
        clearDraft(configId, today, exId, i);
      }
    }
    paint();
  };

  const updateSetState = async (exId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
    const states = setStates.get(exId);
    if (!states || setIndex >= states.length) return;
    const st = states[setIndex]!;
    st[field] = value;
    saveDraft(configId, today, exId, setIndex, states[setIndex]!.weight, states[setIndex]!.reps);
    if (st.setEntryId) {
      const w = field === 'weight' ? parseFloat(value) || null : parseFloat(st.weight) || null;
      const r = field === 'reps' ? parseInt(value) || null : parseInt(st.reps) || null;
      await updateSet(st.setEntryId, { weight: w, reps: r });
    }
  };

  const addAllSets = async () => {
    let count = 0;
    for (const ex of resolved) {
      if (ex.isNA) continue;
      const states = setStates.get(ex.id);
      if (!states) continue;
      const we = await findOrCreateWe(ex);
      if (!we) continue;
      for (let i = 0; i < states.length; i++) {
        const st = states[i]!;
        if (st.done) continue;
        const weight = parseFloat(st.weight) || null;
        const reps = parseInt(st.reps) || null;

        const existingSets = await setRepo.getByWorkoutExercise(we.id);
        const nextSetNumber = existingSets.length > 0
          ? Math.max(...existingSets.map((s) => s.setNumber)) + 1
          : 1;

        const result = await addSet({
          workoutExerciseId: we.id,
          weight,
          reps,
          setNumber: nextSetNumber,
          programSource: buildSource(ex, i),
        });
        st.done = true;
        st.setEntryId = result.set.id;
        st.weId = we.id;
        clearDraft(configId, today, ex.id, i);
        count++;
      }
    }
    if (count > 0) {
      toast(`Added ${count} set${count > 1 ? 's' : ''} to workout`);
      clearAllDrafts(configId, today);
    }
    paint();
  };

  const paint = () => {
    clear(shell);
    const refreshed = getConfig(configId);
    if (!refreshed) return;

    // Header
    const head = el('div', { className: 'panel panel-pad' });
    const activeExercises = resolved.filter((e) => !e.isNA);
    head.append(
      el('div', { style: 'font-weight:700;font-size:1.05rem', textContent: session.name }),
      el('div', { style: 'color:var(--text-3);font-size:0.8rem;margin-top:0.15rem' }, [
        `${weeks[weekIndex]?.label ?? ''} · ${activeExercises.length} exercises`,
      ]),
    );
    shell.appendChild(head);

    // Disclaimer
    const disc = el('div', {
      className: 'panel panel-pad',
      style: 'font-size:0.78rem;color:var(--text-3);line-height:1.4;background:var(--bg-panel-2)',
      textContent: 'ⓘ Each ticked set will be added to today\'s workout. Edit weight/reps before ticking.',
    });
    shell.appendChild(disc);

    // Session notes
    if (session.notes && session.notes.length > 0) {
      const notePanel = el('div', { className: 'panel panel-pad', style: 'font-size:0.82rem;color:var(--text-2);line-height:1.5' });
      for (const n of session.notes) {
        notePanel.appendChild(el('p', { style: 'margin:0.15rem 0', textContent: n }));
      }
      shell.appendChild(notePanel);
    }

    // Exercise cards
    for (const ex of resolved) {
      const states = setStates.get(ex.id);

      // N/A slots — show as disabled
      if (ex.isNA) {
        const card = el('div', { className: 'list-item', style: 'opacity:0.45' });
        const mid = el('div', { style: 'flex:1;min-width:0' });
        mid.append(
          el('div', { className: 'title', style: 'font-size:0.85rem;text-decoration:line-through', textContent: ex.name }),
          el('div', { className: 'meta', textContent: 'N/A — not performed' }),
        );
        card.appendChild(mid);
        shell.appendChild(card);
        continue;
      }

      if (!states || (ex.sets.length === 0 && !ex.summary)) {
        const card = el('div', { className: 'list-item', style: 'opacity:0.6' });
        const mid = el('div', { style: 'flex:1;min-width:0' });
        mid.append(
          el('div', { className: 'title', style: 'font-size:0.85rem', textContent: ex.name }),
          el('div', { className: 'meta', textContent: 'Optional — choose your own exercise' }),
        );
        card.appendChild(mid);
        shell.appendChild(card);
        continue;
      }

      const doneCount = states.filter((s) => s.done).length;
      const allDone = states.length > 0 && doneCount === states.length;

      const card = el('div', { className: 'panel', style: 'overflow:hidden' });
      const headRow = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.5rem 0.65rem 0.25rem',
      });

      // ── Parent exercise checkbox (interactive) ──
      const exCheck = el('button', {
        type: 'button',
        'aria-pressed': allDone ? 'true' : 'false',
        'aria-label': `${allDone ? 'Uncomplete' : 'Complete'} ${ex.name}`,
        style: `width:18px;height:18px;border-radius:3px;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;border:2px solid ${allDone ? 'var(--accent)' : 'var(--text-3)'};background:${allDone ? 'var(--accent)' : 'transparent'};color:${allDone ? 'var(--text-inv)' : 'transparent'};padding:0;cursor:pointer`,
        textContent: allDone ? '✓' : '',
      });
      exCheck.addEventListener('click', () => void toggleAllSetsForExercise(ex.id));

      const titles = el('div', { style: 'flex:1;min-width:0' });
      titles.append(
        el('div', { className: 'title', style: `font-size:0.88rem;${allDone ? 'color:var(--accent)' : ''}`, textContent: ex.name }),
      );
      if (ex.note) {
        titles.appendChild(el('div', { className: 'meta', style: 'font-size:0.75rem', textContent: ex.note }));
      }
      const countLabel = el('span', {
        style: `font-size:0.72rem;color:${allDone ? 'var(--accent)' : 'var(--text-3)'};font-weight:600`,
        textContent: `${doneCount}/${states.length}`,
      });
      headRow.append(exCheck, titles, countLabel);
      card.appendChild(headRow);

      // Set rows
      if (states.length > 0) {
        const setList = el('div', { style: 'padding:0.15rem 0.65rem 0.5rem' });
        for (let i = 0; i < states.length; i++) {
          const st = states[i]!;
          const row = el('div', {
            style: 'display:flex;align-items:center;gap:0.35rem;padding:0.2rem 0;font-size:0.85rem',
          });

          const cb = el('button', {
            type: 'button',
            'aria-pressed': st.done ? 'true' : 'false',
            'aria-label': `Set ${i + 1}`,
            style: `width:18px;height:18px;border-radius:3px;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;border:2px solid ${st.done ? 'var(--accent)' : 'var(--text-3)'};background:${st.done ? 'var(--accent)' : 'transparent'};color:${st.done ? 'var(--text-inv)' : 'transparent'};padding:0;cursor:pointer`,
            textContent: st.done ? '✓' : '',
          });
          const idx = i;
          cb.addEventListener('click', () => void toggleSet(ex.id, idx));
          row.appendChild(cb);

          row.appendChild(el('span', { style: 'color:var(--text-3);min-width:1.2rem;font-size:0.78rem', textContent: `${i + 1}.` }));

          const wInp = el('input', {
            type: 'text',
            inputmode: 'decimal',
            'aria-label': 'Weight (kg)',
            style: 'width:4rem;padding:0.2rem 0.35rem;border:1px solid var(--border-subtle);border-radius:4px;background:var(--bg);color:inherit;font-size:0.85rem;font-family:var(--font-mono);text-align:right',
            value: st.weight,
            placeholder: 'wt',
          }) as HTMLInputElement;
          wInp.addEventListener('focus', () => wInp.select());
          wInp.addEventListener('input', () => void updateSetState(ex.id, idx, 'weight', wInp.value));
          row.appendChild(wInp);

          row.appendChild(el('span', { style: 'color:var(--text-3);font-size:0.8rem;padding:0 0.1rem', textContent: '×' }));

          const rInp = el('input', {
            type: 'text',
            inputmode: 'numeric',
            'aria-label': 'Reps',
            style: 'width:3rem;padding:0.2rem 0.35rem;border:1px solid var(--border-subtle);border-radius:4px;background:var(--bg);color:inherit;font-size:0.85rem;font-family:var(--font-mono);text-align:right',
            value: st.reps,
            placeholder: 'reps',
          }) as HTMLInputElement;
          rInp.addEventListener('focus', () => rInp.select());
          rInp.addEventListener('input', () => void updateSetState(ex.id, idx, 'reps', rInp.value));
          row.appendChild(rInp);

          const note = ex.sets[i]?.note;
          if (note) {
            row.appendChild(el('span', { style: 'color:var(--text-3);font-size:0.72rem;margin-left:0.2rem', textContent: note }));
          }

          setList.appendChild(row);
        }
        card.appendChild(setList);
      }

      shell.appendChild(card);
    }

    // Bottom actions
    const actions = el('div', { className: 'row', style: 'margin-top:0.3rem' });
    const activeResolved = resolved.filter((e) => !e.isNA && e.sets.length > 0);
    const allComplete = activeResolved.every((ex) => {
      const states = setStates.get(ex.id);
      return states ? states.every((s) => s.done) : false;
    });

    const addBtn = el('button', {
      type: 'button',
      className: 'btn btn-primary btn-block',
      textContent: allComplete ? '✓ View in workout' : 'Add session to workout',
      style: 'flex:1',
    });
    addBtn.addEventListener('click', () => {
      if (allComplete) { router.navigate('workout', { id: workout.id }); return; }
      void addAllSets();
    });
    actions.appendChild(addBtn);

    const doneBtn = el('button', {
      type: 'button',
      className: `btn ${allComplete ? 'btn-accent' : 'btn-ghost'}`,
      textContent: allComplete ? '✓ Session complete' : 'Mark session done',
      style: 'flex:0 0 auto',
    });
    doneBtn.addEventListener('click', () => {
      const updated = toggleSessionDone(configId, sessionId);
      if (updated) {
        toast(allComplete ? 'Session completed!' : 'Session marked done');
        paint();
      }
    });
    actions.appendChild(doneBtn);

    shell.appendChild(actions);
  };

  paint();
}
