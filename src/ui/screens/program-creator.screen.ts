import type { ProgramWeekDef, ProgramSessionDef, ProgramExerciseDef } from '../../types';
import { el, clear } from '../../utils/dom';
import { createCustomProgram } from '../../services/program.service';
import { openModal, confirmDialog } from '../modal';
import { router } from '../router';
import { toast } from '../toast';
import { createId } from '../../utils/id';

interface BuilderExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  note: string;
}

interface BuilderSession {
  id: string;
  name: string;
  exercises: BuilderExercise[];
}

interface BuilderWeek {
  label: string;
  sessions: BuilderSession[];
}

export async function renderProgramCreatorScreen(root: HTMLElement): Promise<void> {
  clear(root);
  const shell = el('div', { className: 'screen-enter stack' });
  root.appendChild(shell);

  let programName = '';
  let programDesc = '';
  const weeks: BuilderWeek[] = [];

  const toWeekDefs = (): ProgramWeekDef[] =>
    weeks.map((w) => ({
      label: w.label,
      sessions: w.sessions.map((s): ProgramSessionDef => ({
        id: s.id,
        name: s.name,
        exercises: s.exercises.map((e): ProgramExerciseDef => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          note: e.note || undefined,
        })),
      })),
    }));

  const paint = () => {
    clear(shell);

    // ── Program info ──
    const infoPanel = el('div', { className: 'panel panel-pad' });
    infoPanel.appendChild(el('div', { style: 'font-weight:650;font-size:0.9rem;color:var(--text-2);margin-bottom:0.5rem', textContent: 'Program info' }));

    const nameField = el('div', { className: 'field' });
    nameField.appendChild(el('label', { textContent: 'Name' }));
    const nameInp = el('input', {
      type: 'text',
      placeholder: 'e.g. My PPL Split',
      'aria-label': 'Program name',
    }) as HTMLInputElement;
    nameInp.value = programName;
    nameInp.addEventListener('input', () => { programName = nameInp.value; });
    nameField.appendChild(nameInp);
    infoPanel.appendChild(nameField);

    const descField = el('div', { className: 'field' });
    descField.appendChild(el('label', { textContent: 'Description' }));
    const descInp = el('input', {
      type: 'text',
      placeholder: 'e.g. 6 day push/pull/legs',
      'aria-label': 'Description',
    }) as HTMLInputElement;
    descInp.value = programDesc;
    descInp.addEventListener('input', () => { programDesc = descInp.value; });
    descField.appendChild(descInp);
    infoPanel.appendChild(descField);
    shell.appendChild(infoPanel);

    // ── Weeks ──
    const weeksPanel = el('div', { className: 'panel', style: 'overflow:hidden' });
    weeksPanel.appendChild(el('div', {
      style: 'padding:0.7rem 0.85rem;font-weight:650;font-size:0.92rem;border-bottom:1px solid var(--border-subtle);background:var(--bg-panel-2)',
      textContent: `Weeks (${weeks.length})`,
    }));

    if (weeks.length === 0) {
      weeksPanel.appendChild(el('div', {
        className: 'empty',
        style: 'padding:1rem',
        textContent: 'No weeks yet — add one below',
      }));
    }

    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi]!;
      const weekBlock = el('div', { style: 'border-bottom:1px solid var(--border-subtle)' });

      // Week header
      const weekHead = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.55rem 0.85rem;background:var(--bg-panel-2)',
      });
      weekHead.appendChild(el('span', {
        style: 'font-weight:650;font-size:0.9rem;flex:1',
        textContent: week.label,
      }));
      const weekEditBtn = el('button', {
        type: 'button',
        className: 'btn btn-ghost btn-sm',
        textContent: 'Edit',
        style: 'font-size:0.75rem;padding:0.15rem 0.45rem',
      });
      weekEditBtn.addEventListener('click', () => openEditWeekModal(wi));
      const weekDelBtn = el('button', {
        type: 'button',
        className: 'btn btn-ghost btn-sm',
        'aria-label': 'Delete week',
        textContent: '×',
        style: 'font-size:0.85rem;padding:0.1rem 0.35rem;color:var(--danger)',
      });
      weekDelBtn.addEventListener('click', () => void removeWeek(wi));
      weekHead.append(weekEditBtn, weekDelBtn);
      weekBlock.appendChild(weekHead);

      // Sessions
      if (week.sessions.length === 0) {
        weekBlock.appendChild(el('div', {
          style: 'padding:0.5rem 0.85rem;font-size:0.82rem;color:var(--text-3)',
          textContent: 'No sessions — tap + below',
        }));
      }

      for (let si = 0; si < week.sessions.length; si++) {
        const session = week.sessions[si]!;
        const sessBlock = el('div', { style: 'border-bottom:1px solid var(--border-subtle)' });

        const sessHead = el('div', {
          style: 'display:flex;align-items:center;gap:0.4rem;padding:0.45rem 0.85rem 0.35rem 1.2rem',
        });
        sessHead.appendChild(el('span', {
          style: 'font-weight:600;font-size:0.85rem;flex:1',
          textContent: session.name,
        }));
        const sessEditBtn = el('button', {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          textContent: 'Edit',
          style: 'font-size:0.72rem;padding:0.1rem 0.4rem',
        });
        sessEditBtn.addEventListener('click', () => openEditSessionModal(wi, si));
        const sessDelBtn = el('button', {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          'aria-label': 'Delete session',
          textContent: '×',
          style: 'font-size:0.82rem;padding:0.05rem 0.3rem;color:var(--danger)',
        });
        sessDelBtn.addEventListener('click', () => void removeSession(wi, si));
        sessHead.append(sessEditBtn, sessDelBtn);
        sessBlock.appendChild(sessHead);

        // Exercises
        for (let ei = 0; ei < session.exercises.length; ei++) {
          const ex = session.exercises[ei]!;
          const exRow = el('div', {
            style: 'display:flex;align-items:center;gap:0.35rem;padding:0.3rem 0.85rem 0.3rem 2rem;font-size:0.84rem;border-bottom:1px solid var(--border-subtle)',
          });
          exRow.appendChild(el('span', {
            style: 'flex:1;min-width:0',
            textContent: ex.name,
          }));
          exRow.appendChild(el('span', {
            style: 'color:var(--text-3);font-family:var(--font-mono);font-size:0.8rem;flex:0 0 auto',
            textContent: `${ex.sets}×${ex.reps}`,
          }));
          if (ex.note) {
            exRow.appendChild(el('span', {
              style: 'color:var(--text-3);font-size:0.72rem;margin-left:0.2rem',
              textContent: ex.note,
            }));
          }
          const exEditBtn = el('button', {
            type: 'button',
            className: 'btn btn-ghost btn-sm',
            'aria-label': 'Edit exercise',
            textContent: '✎',
            style: 'font-size:0.72rem;padding:0.05rem 0.25rem',
          });
          exEditBtn.addEventListener('click', () => openEditExerciseModal(wi, si, ei));
          const exDelBtn = el('button', {
            type: 'button',
            className: 'btn btn-ghost btn-sm',
            'aria-label': 'Delete exercise',
            textContent: '×',
            style: 'font-size:0.75rem;padding:0.05rem 0.25rem;color:var(--danger)',
          });
          exDelBtn.addEventListener('click', () => void removeExercise(wi, si, ei));
          exRow.append(exEditBtn, exDelBtn);
          sessBlock.appendChild(exRow);
        }

        // Add exercise button
        const addExBtn = el('button', {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          textContent: '+ Exercise',
          style: 'font-size:0.75rem;padding:0.25rem 0.85rem 0.25rem 2rem;color:var(--accent);width:100%;text-align:left',
        });
        addExBtn.addEventListener('click', () => openAddExerciseModal(wi, si));
        sessBlock.appendChild(addExBtn);

        weekBlock.appendChild(sessBlock);
      }

      // Add session button
      const addSessBtn = el('button', {
        type: 'button',
        className: 'btn btn-ghost btn-sm',
        textContent: '+ Session',
        style: 'font-size:0.78rem;padding:0.35rem 0.85rem;color:var(--accent);width:100%;text-align:left',
      });
      addSessBtn.addEventListener('click', () => openAddSessionModal(wi));
      weekBlock.appendChild(addSessBtn);

      weeksPanel.appendChild(weekBlock);
    }

    shell.appendChild(weeksPanel);

    // Add week button
    const addWeekBtn = el('button', {
      type: 'button',
      className: 'btn btn-ghost btn-block',
      textContent: '+ Add Week',
      style: 'margin:0.3rem 0;color:var(--accent);font-weight:600',
    });
    addWeekBtn.addEventListener('click', openAddWeekModal);
    shell.appendChild(addWeekBtn);

    // ── Save button ──
    const saveBtn = el('button', {
      type: 'button',
      className: 'btn btn-primary btn-block',
      textContent: 'Save program',
      style: 'margin:0.5rem 0 1.5rem',
    });
    saveBtn.addEventListener('click', saveProgram);
    shell.appendChild(saveBtn);
  };

  // ── Week modals ──

  function openAddWeekModal() {
    const label = `Week ${weeks.length + 1}`;
    const inp = el('input', {
      type: 'text',
      value: label,
      'aria-label': 'Week label',
    }) as HTMLInputElement;
    const field = el('div', { className: 'field' });
    field.append(el('label', { textContent: 'Week label' }), inp);

    openModal({
      title: 'Add week',
      content: field,
      center: true,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Add',
          variant: 'primary',
          onClick: () => {
            const val = inp.value.trim();
            if (!val) { toast('Label required'); return; }
            weeks.push({ label: val, sessions: [] });
            paint();
          },
        },
      ],
    });
    setTimeout(() => inp.focus(), 50);
  }

  function openEditWeekModal(wi: number) {
    const week = weeks[wi];
    if (!week) return;
    const inp = el('input', {
      type: 'text',
      value: week.label,
      'aria-label': 'Week label',
    }) as HTMLInputElement;
    const field = el('div', { className: 'field' });
    field.append(el('label', { textContent: 'Week label' }), inp);

    openModal({
      title: 'Edit week',
      content: field,
      center: true,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Save',
          variant: 'primary',
          onClick: () => {
            const val = inp.value.trim();
            if (!val) { toast('Label required'); return; }
            week.label = val;
            paint();
          },
        },
      ],
    });
    setTimeout(() => inp.focus(), 50);
  }

  async function removeWeek(wi: number) {
    const week = weeks[wi];
    if (!week) return;
    const count = week.sessions.reduce((n, s) => n + s.exercises.length, 0);
    const msg = count > 0
      ? `Delete "${week.label}"? ${week.sessions.length} session(s), ${count} exercise(s) will be lost.`
      : `Delete "${week.label}"?`;
    const ok = await confirmDialog({ title: 'Delete week?', message: msg, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    weeks.splice(wi, 1);
    paint();
  }

  // ── Session modals ──

  function openAddSessionModal(wi: number) {
    const week = weeks[wi];
    if (!week) return;
    const inp = el('input', {
      type: 'text',
      placeholder: 'e.g. Push A',
      'aria-label': 'Session name',
    }) as HTMLInputElement;
    const field = el('div', { className: 'field' });
    field.append(el('label', { textContent: 'Session name' }), inp);

    openModal({
      title: 'Add session',
      content: field,
      center: true,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Add',
          variant: 'primary',
          onClick: () => {
            const val = inp.value.trim();
            if (!val) { toast('Name required'); return; }
            week.sessions.push({ id: createId('sess'), name: val, exercises: [] });
            paint();
          },
        },
      ],
    });
    setTimeout(() => inp.focus(), 50);
  }

  function openEditSessionModal(wi: number, si: number) {
    const session = weeks[wi]?.sessions[si];
    if (!session) return;
    const inp = el('input', {
      type: 'text',
      value: session.name,
      'aria-label': 'Session name',
    }) as HTMLInputElement;
    const field = el('div', { className: 'field' });
    field.append(el('label', { textContent: 'Session name' }), inp);

    openModal({
      title: 'Edit session',
      content: field,
      center: true,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Save',
          variant: 'primary',
          onClick: () => {
            const val = inp.value.trim();
            if (!val) { toast('Name required'); return; }
            session.name = val;
            paint();
          },
        },
      ],
    });
    setTimeout(() => inp.focus(), 50);
  }

  async function removeSession(wi: number, si: number) {
    const session = weeks[wi]?.sessions[si];
    if (!session) return;
    const count = session.exercises.length;
    const msg = count > 0
      ? `Delete "${session.name}"? ${count} exercise(s) will be lost.`
      : `Delete "${session.name}"?`;
    const ok = await confirmDialog({ title: 'Delete session?', message: msg, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    weeks[wi]!.sessions.splice(si, 1);
    paint();
  }

  // ── Exercise modals ──

  function openAddExerciseModal(wi: number, si: number) {
    const session = weeks[wi]?.sessions[si];
    if (!session) return;
    openExerciseModal('Add exercise', null, (ex) => {
      session.exercises.push(ex);
      paint();
    });
  }

  function openEditExerciseModal(wi: number, si: number, ei: number) {
    const ex = weeks[wi]?.sessions[si]?.exercises[ei];
    if (!ex) return;
    openExerciseModal('Edit exercise', ex, (updated) => {
      ex.name = updated.name;
      ex.sets = updated.sets;
      ex.reps = updated.reps;
      ex.note = updated.note;
      paint();
    });
  }

  async function removeExercise(wi: number, si: number, ei: number) {
    const ex = weeks[wi]?.sessions[si]?.exercises[ei];
    if (!ex) return;
    const ok = await confirmDialog({ title: 'Delete exercise?', message: `Delete "${ex.name}"?`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    weeks[wi]!.sessions[si]!.exercises.splice(ei, 1);
    paint();
  }

  function openExerciseModal(
    title: string,
    existing: BuilderExercise | null,
    onSave: (ex: BuilderExercise) => void,
  ) {
    const nameInp = el('input', {
      type: 'text',
      value: existing?.name ?? '',
      placeholder: 'e.g. Bench Press',
      'aria-label': 'Exercise name',
    }) as HTMLInputElement;
    const setsInp = el('input', {
      type: 'number',
      min: '1',
      value: existing ? String(existing.sets) : '3',
      'aria-label': 'Sets',
    }) as HTMLInputElement;
    const repsInp = el('input', {
      type: 'text',
      value: existing?.reps ?? '10',
      placeholder: 'e.g. 10 or 8-10 or AMRAP',
      'aria-label': 'Reps',
    }) as HTMLInputElement;
    const noteInp = el('input', {
      type: 'text',
      value: existing?.note ?? '',
      placeholder: 'Optional (e.g. slow tempo)',
      'aria-label': 'Note',
    }) as HTMLInputElement;

    const content = el('div', { className: 'stack' });

    const nameField = el('div', { className: 'field' });
    nameField.append(el('label', { textContent: 'Exercise name' }), nameInp);
    content.appendChild(nameField);

    const setsRepsRow = el('div', { style: 'display:flex;gap:0.5rem' });
    const setsField = el('div', { className: 'field', style: 'flex:1' });
    setsField.append(el('label', { textContent: 'Sets' }), setsInp);
    const repsField = el('div', { className: 'field', style: 'flex:1' });
    repsField.append(el('label', { textContent: 'Reps' }), repsInp);
    setsRepsRow.append(setsField, repsField);
    content.appendChild(setsRepsRow);

    const noteField = el('div', { className: 'field' });
    noteField.append(el('label', { textContent: 'Note (optional)' }), noteInp);
    content.appendChild(noteField);

    openModal({
      title,
      content,
      center: true,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: existing ? 'Save' : 'Add',
          variant: 'primary',
          onClick: () => {
            const name = nameInp.value.trim();
            if (!name) { toast('Name required'); return; }
            const sets = parseInt(setsInp.value) || 0;
            if (sets < 1) { toast('Sets must be at least 1'); return; }
            const reps = repsInp.value.trim() || '10';
            onSave({
              id: existing?.id ?? createId('pex'),
              name,
              sets,
              reps,
              note: noteInp.value.trim(),
            });
          },
        },
      ],
    });
    setTimeout(() => nameInp.focus(), 50);
  }

  // ── Save ──

  function saveProgram() {
    const name = programName.trim();
    if (!name) { toast('Program name required'); return; }
    if (weeks.length === 0) { toast('Add at least one week'); return; }
    const totalSessions = weeks.reduce((n, w) => n + w.sessions.length, 0);
    if (totalSessions === 0) { toast('Add at least one session'); return; }

    createCustomProgram(name, programDesc.trim(), toWeekDefs());
    toast(`Created "${name}"`);
    router.navigate('programs');
  }

  paint();
}
