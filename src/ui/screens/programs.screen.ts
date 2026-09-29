import { el, clear } from '../../utils/dom';
import { debounce } from '../../utils/debounce';
import {
  listPrograms,
  listCustomPrograms,
  getActiveConfigs,
  createProgramConfig,
  deleteConfig,
  getProgramById,
  getAllProgramExerciseNames,
  deleteCustomProgram,
  suggestMatch,
} from '../../services/program.service';
import { listExercises, createExercise, listCategories } from '../../services/exercise.service';
import { saveMapping, saveAccessoryMapping } from '../../services/exercise-mapping.service';
import { openModal, confirmDialog } from '../modal';
import { router } from '../router';
import { toast } from '../toast';
import type { ProgramConfig, ProgramDefinition, Exercise, ProgramExerciseDef } from '../../types';

export async function renderProgramsScreen(root: HTMLElement): Promise<void> {
  clear(root);
  const shell = el('div', { className: 'screen-enter stack' });
  root.appendChild(shell);

  const paint = () => {
    clear(shell);
    shell.appendChild(
      el('div', { style: 'color:var(--text-3);font-size:0.85rem' }, [
        'Structured training programs with auto-calculated weights and progress tracking.',
      ]),
    );

    const createBtn = el('button', {
      type: 'button',
      className: 'btn btn-primary btn-block',
      textContent: '+ Create program',
      style: 'margin:0.3rem 0 0.4rem',
    });
    createBtn.addEventListener('click', () => router.navigate('program-creator'));
    shell.appendChild(createBtn);

    const active = getActiveConfigs();
    if (active.length > 0) {
      const activeGroup = el('div', { className: 'stack' });
      activeGroup.appendChild(el('div', { style: 'font-weight:650;font-size:0.9rem;color:var(--text-2)' }, ['Active programs']));
      for (const cfg of active) {
        activeGroup.appendChild(renderActiveProgramCard(cfg, () => paint()));
      }
      shell.appendChild(activeGroup);
    }

    const availGroup = el('div', { className: 'stack' });
    availGroup.appendChild(el('div', { style: 'font-weight:650;font-size:0.9rem;color:var(--text-2);margin-top:0.5rem' }, ['Available programs']));

    const programs = listPrograms();
    const customIds = new Set(listCustomPrograms().map((p) => p.id));
    for (const prog of programs) {
      const alreadyActive = active.some((c) => c.programId === prog.id);
      availGroup.appendChild(renderProgramCard(prog, alreadyActive, customIds.has(prog.id), () => paint()));
    }
    shell.appendChild(availGroup);
  };

  paint();
}

function renderActiveProgramCard(cfg: ProgramConfig, refresh: () => void): HTMLElement {
  const card = el('div', { className: 'list-item', style: 'cursor:pointer;border-color:var(--border-strong);background:var(--accent-dim)' });
  const mid = el('div', { style: 'flex:1' });
  const sessionsTotal = Object.keys(cfg.sessionProgress).length;
  const sessionsDone = Object.values(cfg.sessionProgress).filter(Boolean).length;
  mid.append(
    el('div', { className: 'title', textContent: cfg.programName }),
    el('div', { className: 'meta', textContent: `Started ${cfg.startDate} · ${sessionsDone}/${sessionsTotal || '—'} sessions done` }),
  );
  const delBtn = el('button', { type: 'button', className: 'btn btn-sm btn-danger', 'aria-label': 'Remove program', textContent: '×', style: 'flex:0 0 auto;min-width:36px' });
  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await confirmDialog({ title: 'Remove program?', message: 'Progress will be lost. Learned exercise mappings are preserved.', danger: true, confirmLabel: 'Remove' });
    if (!ok) return;
    deleteConfig(cfg.id);
    toast('Program removed');
    refresh();
  });
  card.append(mid, delBtn);
  card.addEventListener('click', () => router.navigate('program-detail', { configId: cfg.id }));
  return card;
}

function renderProgramCard(
  prog: { id: string; name: string; description: string },
  alreadyActive: boolean,
  isCustom: boolean,
  refresh: () => void,
): HTMLElement {
  const card = el('div', { className: 'list-item', style: 'cursor:pointer;opacity:' + (alreadyActive ? '0.5' : '1') });
  const mid = el('div', { style: 'flex:1' });
  mid.append(
    el('div', { className: 'title', textContent: prog.name }),
    el('div', { className: 'meta', textContent: prog.description.length > 80 ? prog.description.slice(0, 80) + '…' : prog.description }),
  );
  card.appendChild(mid);
  if (!alreadyActive) {
    card.addEventListener('click', () => startProgramWizard(prog.id));
  } else {
    card.appendChild(el('span', { style: 'color:var(--accent);font-size:0.82rem;font-weight:600', textContent: 'Active' }));
  }
  if (isCustom) {
    const delBtn = el('button', {
      type: 'button',
      className: 'btn btn-sm btn-danger',
      'aria-label': 'Delete program',
      textContent: '×',
      style: 'flex:0 0 auto;min-width:36px',
    });
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await confirmDialog({ title: 'Delete custom program?', message: `"${prog.name}" will be permanently deleted.`, danger: true, confirmLabel: 'Delete' });
      if (!ok) return;
      deleteCustomProgram(prog.id);
      toast('Program deleted');
      refresh();
    });
    card.appendChild(delBtn);
  }
  return card;
}

/** Group accessory options by context for better UX (fallback for programs without setupGroups). */
function groupByContext(exercises: ProgramExerciseDef[]): Map<string, ProgramExerciseDef[]> {
  const groups = new Map<string, ProgramExerciseDef[]>();
  const contextLabels: Record<string, string> = {
    'lower': 'Lower Body Exercises',
    'upper': 'Upper Body Exercises',
    'push': 'Push Exercises',
    'pull': 'Pull Exercises',
    'legs': 'Leg Exercises',
    'full body': 'Full Body Exercises',
  };

  for (const ex of exercises) {
    const ctx = ex.context ?? 'full body';
    const label = contextLabels[ctx] ?? 'Other';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(ex);
  }
  return groups;
}

async function startProgramWizard(programId: string): Promise<void> {
  const prog = getProgramById(programId);
  if (!prog) return;

  const stepContent = el('div', { className: 'stack' });

  let selectedVariantId: string | undefined;
  const liftValues: Record<string, string> = {};
  const accessoryValues: Record<string, string> = {};
  let exerciseMappings: Record<string, string> = {};
  let exerciseMappingIds: Record<string, string> = {};
  let naSlots: Record<string, boolean> = {};
  // For setupGroups: track optional slot entries as { slotId -> exerciseName }
  // Only one exercise per slot (or empty string if not set)
  const optionalExercises: Record<string, string> = {};
  // Track how many extra optional slots the user has added per group
  const dynamicSlotCount: Record<string, number> = {};

  const allLib = await listExercises();

  // Seed exercise mappings with auto-detected suggestions so they're
  // included in the config even if the user never clicks "Change".
  const progNames = getAllProgramExerciseNames(prog);
  for (const pn of progNames) {
    if (!exerciseMappings[pn]) {
      const suggestion = suggestMatch(pn, allLib, undefined, programId);
      if (suggestion) {
        exerciseMappings[pn] = suggestion.name;
        exerciseMappingIds[pn] = suggestion.id;
      }
    }
  }

  const _renderStepInner = () => {
    clear(stepContent);

    // Variant picker (if applicable)
    if (prog.variants && prog.variants.length > 0) {
      const field = el('div', { className: 'field' });
      field.appendChild(el('label', { textContent: 'Choose a variant:' }));
      const sel = el('select', { 'aria-label': 'variant' }) as HTMLSelectElement;
      for (const v of prog.variants) {
        sel.appendChild(el('option', { value: v.id, textContent: v.label }));
      }
      if (!selectedVariantId && prog.variants.length > 0) {
        selectedVariantId = prog.variants[0]!.id;
      }
      sel.value = selectedVariantId ?? prog.variants[0]!.id;
      sel.addEventListener('change', () => { selectedVariantId = sel.value; });
      field.appendChild(sel);
      stepContent.appendChild(field);
    }

    const isPctBased = !!prog.trainingMaxPct;
    stepContent.appendChild(el('p', { style: 'color:var(--text-2);font-size:0.9rem' }, [
      isPctBased ? 'Enter your 1RM for each lift (training max will use 90%):' : 'Enter your starting weight for each lift:',
    ]));

    for (const liftName of prog.liftInputs) {
      const field = el('div', { className: 'field' });
      const labelText = isPctBased ? `${liftName} 1RM` : `${liftName} starting weight`;
      field.appendChild(el('label', { textContent: labelText }));
      const inp = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'e.g. 100', 'aria-label': liftName }) as HTMLInputElement;
      if (liftValues[liftName]) inp.value = liftValues[liftName];
      inp.addEventListener('input', () => { liftValues[liftName] = inp.value; });
      liftValues[liftName] = inp.value;
      field.appendChild(inp);
      stepContent.appendChild(field);
    }

    // ── Accessory exercises ──
    if (prog.setupGroups && prog.setupGroups.length > 0) {
      // Show schedule overview
      renderScheduleOverview(stepContent, prog);
      renderSetupGroupsWizard(stepContent, prog, accessoryValues, naSlots, optionalExercises, dynamicSlotCount);
    } else {
      renderFallbackAccessoryWizard(stepContent, prog, accessoryValues, naSlots);
    }

    // ── Exercise mappings ──
    const progNames = getAllProgramExerciseNames(prog);
    if (progNames.length > 0) {
      stepContent.appendChild(el('p', { style: 'color:var(--text-2);font-size:0.9rem;margin-top:0.5rem' }, [
        'Match each program exercise to a library exercise:',
      ]));
      const mapList = el('div', { className: 'stack', style: 'margin-top:0.3rem' });
      renderMappingList(mapList, progNames);
      stepContent.appendChild(mapList);
    }
  };

  const renderStep = () => {
    // Preserve scroll position across re-renders
    const scrollParent = stepContent.parentElement;
    const prevTop = scrollParent?.scrollTop ?? 0;
    _renderStepInner();
    if (scrollParent) requestAnimationFrame(() => { scrollParent.scrollTop = prevTop; });
  };

  // ── Schedule overview (shows which days have which workouts) ──
  function renderScheduleOverview(container: HTMLElement, prog: ProgramDefinition) {
    // Collect unique session names across all weeks
    const sessionTypes = new Map<string, Set<string>>(); // sessionName -> Set of day types
    for (const week of prog.weeks) {
      for (const session of week.sessions) {
        // Extract day type from session name (e.g. "Tuesday — Squat & Deadlift" -> "Lower Body")
        const lowerBody = session.name.toLowerCase().includes('squat') || session.name.toLowerCase().includes('deadlift');
        const upperBody = session.name.toLowerCase().includes('bench') || session.name.toLowerCase().includes('upper');
        const dayType = lowerBody ? 'Lower Body' : upperBody ? 'Upper Body' : 'Other';
        if (!sessionTypes.has(dayType)) sessionTypes.set(dayType, new Set());
        sessionTypes.get(dayType)!.add(session.name.split('—')[0]?.trim() ?? session.name);
      }
    }

    if (sessionTypes.size === 0) return;

    const overview = el('div', {
      style: 'border:1px solid var(--border-subtle);border-radius:8px;padding:0.75rem;margin-top:0.75rem;background:var(--surface-1)',
    });
    overview.appendChild(el('div', {
      style: 'font-weight:650;font-size:0.9rem;color:var(--text-1);margin-bottom:0.5rem',
      textContent: 'Weekly Schedule',
    }));

    for (const [dayType, days] of sessionTypes) {
      const row = el('div', { style: 'display:flex;gap:0.5rem;margin-bottom:0.25rem;font-size:0.82rem' });
      row.appendChild(el('span', { style: 'font-weight:600;color:var(--text-2);min-width:5rem', textContent: `${dayType}:` }));
      row.appendChild(el('span', { style: 'color:var(--text-3)', textContent: [...days].join(', ') }));
      overview.appendChild(row);
    }

    container.appendChild(overview);
  }

  // ── Setup-groups wizard (when program defines setupGroups) ──
  function renderSetupGroupsWizard(
    container: HTMLElement,
    prog: ProgramDefinition,
    accessoryValues: Record<string, string>,
    naSlots: Record<string, boolean>,
    optionalExercises: Record<string, string>,
    dynamicSlotCount: Record<string, number>,
  ) {
    const sorted = [...prog.setupGroups!].sort((a, b) => a.order - b.order);

    for (const group of sorted) {
      // Group card
      const card = el('div', {
        style: 'border:1px solid var(--border-subtle);border-radius:8px;padding:0.75rem;margin-top:0.75rem;background:var(--surface-1)',
      });

      // Group heading
      card.appendChild(el('div', {
        style: 'font-weight:650;font-size:0.9rem;color:var(--text-1);margin-bottom:0.25rem',
        textContent: group.label,
      }));
      if (group.description) {
        card.appendChild(el('p', { style: 'color:var(--text-3);font-size:0.78rem;margin:0 0 0.5rem' }, [group.description]));
      }

      // Render static slots
      for (const slot of group.slots) {
        if (slot.type === 'fixed') {
          renderFixedSlot(card, slot, accessoryValues, naSlots);
        } else if (slot.type === 'optional') {
          renderOptionalSlot(card, slot, optionalExercises, naSlots);
        }
      }

      // Render dynamic optional slots (user-added extras beyond the static ones)
      const extraCount = dynamicSlotCount[group.id] ?? 0;
      for (let i = 0; i < extraCount; i++) {
        const dynamicId = `${group.id}_extra_${i}`;
        const dynamicLabel = `Optional Exercise ${group.slots.filter((s) => s.type === 'optional').length + i + 1}`;
        renderDynamicOptionalSlot(card, dynamicId, dynamicLabel, optionalExercises, naSlots);
      }

      // "+ Add another optional exercise" button
      const hasOptionalSlots = group.slots.some((s) => s.type === 'optional');
      if (hasOptionalSlots) {
        const addAnotherBtn = el('button', {
          type: 'button',
          className: 'btn btn-ghost',
          textContent: '+ Add another optional exercise',
          style: 'margin-top:0.5rem;font-size:0.78rem;align-self:flex-start',
        });
        addAnotherBtn.addEventListener('click', () => {
          dynamicSlotCount[group.id] = (dynamicSlotCount[group.id] ?? 0) + 1;
          renderStep(); // re-render entire wizard
        });
        card.appendChild(addAnotherBtn);
      }

      container.appendChild(card);
    }
  }

  function renderFixedSlot(
    container: HTMLElement,
    slot: Extract<import('../../types').SetupSlot, { type: 'fixed' }>,
    accessoryValues: Record<string, string>,
    naSlots: Record<string, boolean>,
  ) {
    const field = el('div', { className: 'field', style: 'margin-bottom:0.5rem' });
    const labelParts: Array<string | HTMLElement> = [slot.label];
    if (slot.naAllowed) {
      labelParts.push(el('span', { style: 'color:var(--text-3);font-size:0.75rem;font-weight:400', textContent: ' (can skip)' }));
    }
    field.appendChild(el('label', { style: 'font-size:0.82rem;font-weight:500' }, labelParts));

    const sel = el('select', { 'aria-label': slot.id, style: 'width:100%;margin-top:0.2rem' }) as HTMLSelectElement;
    if (slot.naAllowed) {
      sel.appendChild(el('option', { value: '__NA__', textContent: '— None / Skip —' }));
    }
    for (const opt of slot.options) {
      sel.appendChild(el('option', { value: opt, textContent: opt }));
    }

    // Pre-select
    const currentVal = accessoryValues[slot.id];
    if (currentVal === '__NA__') {
      sel.value = '__NA__';
    } else if (currentVal) {
      sel.value = currentVal;
    } else if (slot.default) {
      sel.value = slot.default;
      accessoryValues[slot.id] = slot.default;
    } else if (slot.options.length > 0) {
      sel.value = slot.options[0]!;
      accessoryValues[slot.id] = slot.options[0]!;
    }

    sel.addEventListener('change', () => {
      accessoryValues[slot.id] = sel.value;
      if (sel.value === '__NA__') {
        naSlots[slot.id] = true;
      } else {
        delete naSlots[slot.id];
      }
    });

    if (currentVal === '__NA__') naSlots[slot.id] = true;
    field.appendChild(sel);
    container.appendChild(field);
  }

  function renderOptionalSlot(
    container: HTMLElement,
    slot: Extract<import('../../types').SetupSlot, { type: 'optional' }>,
    optionalExercises: Record<string, string>,
    naSlots: Record<string, boolean>,
  ) {
    const exerciseName = optionalExercises[slot.id] ?? '';
    const isNA = !!naSlots[slot.id];

    // Section label
    const headerRow = el('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;margin-top:0.5rem;padding-bottom:0.25rem;border-bottom:1px solid var(--border-subtle)',
    });
    headerRow.appendChild(el('span', {
      style: 'font-size:0.82rem;font-weight:600;color:var(--text-2)',
      textContent: slot.label,
    }));
    if (slot.appliesTo) {
      headerRow.appendChild(el('span', {
        style: 'font-size:0.7rem;color:var(--text-3)',
        textContent: slot.appliesTo,
      }));
    }
    container.appendChild(headerRow);

    const rowContainer = el('div', { style: 'margin-top:0.3rem' });

    if (isNA) {
      // Marked as N/A — show muted row with Undo
      const row = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.4rem;font-size:0.82rem;border:1px dashed var(--border-subtle);border-radius:4px;background:var(--surface)',
      });
      row.appendChild(el('span', {
        style: 'flex:1;color:var(--text-3);font-style:italic',
        textContent: 'Not used',
      }));
      const undoBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.7rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--text-2)',
        textContent: 'Undo',
      });
      undoBtn.addEventListener('click', () => {
        delete naSlots[slot.id];
        renderStep();
      });
      row.appendChild(undoBtn);
      rowContainer.appendChild(row);
    } else if (exerciseName) {
      // Has an exercise — show it with Skip + Remove
      const row = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.4rem;font-size:0.82rem;border:1px solid var(--border-subtle);border-radius:4px;background:var(--surface)',
      });
      row.appendChild(el('span', {
        style: 'flex:1;color:var(--text-1);font-weight:500',
        textContent: exerciseName,
      }));
      const skipBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.7rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--text-3)',
        textContent: 'Skip',
      });
      skipBtn.addEventListener('click', () => {
        naSlots[slot.id] = true;
        renderStep();
      });
      const removeBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.7rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--danger)',
        textContent: '✕',
      });
      removeBtn.addEventListener('click', () => {
        delete optionalExercises[slot.id];
        delete naSlots[slot.id];
        renderStep();
      });
      row.append(skipBtn, removeBtn);
      rowContainer.appendChild(row);
    } else {
      // Empty — show "Not used" with Skip and Add buttons
      const emptyRow = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.4rem;font-size:0.78rem;border:1px dashed var(--border-subtle);border-radius:4px;margin-bottom:0.25rem;background:var(--surface)',
      });
      emptyRow.appendChild(el('span', {
        style: 'flex:1;color:var(--text-3);font-style:italic',
        textContent: 'No exercise selected',
      }));
      const skipBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.7rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--text-3)',
        textContent: 'Skip',
      });
      skipBtn.addEventListener('click', () => {
        naSlots[slot.id] = true;
        renderStep();
      });
      emptyRow.appendChild(skipBtn);
      rowContainer.appendChild(emptyRow);

      // Add button
      const addBtn = el('button', {
        type: 'button',
        className: 'btn btn-ghost',
        textContent: slot.addLabel,
        style: 'font-size:0.78rem;align-self:flex-start',
      });
      addBtn.addEventListener('click', () => {
        const { close } = openModal({
          title: `Add ${slot.label}`,
          content: renderFilteredExercisePicker(allLib, slot.context, (ex) => {
            optionalExercises[slot.id] = ex.name;
            close();
            renderStep();
          }),
          onClose: () => renderStep(),
        });
      });
      rowContainer.appendChild(addBtn);
    }

    container.appendChild(rowContainer);
  }

  /** Render a dynamically-added optional slot (not part of the program definition). */
  function renderDynamicOptionalSlot(
    container: HTMLElement,
    slotId: string,
    label: string,
    optionalExercises: Record<string, string>,
    naSlots: Record<string, boolean>,
  ) {
    const exerciseName = optionalExercises[slotId] ?? '';
    const isNA = !!naSlots[slotId];

    // Label
    container.appendChild(el('div', {
      style: 'font-size:0.78rem;font-weight:600;color:var(--text-2);margin-top:0.5rem;padding-bottom:0.2rem;border-bottom:1px solid var(--border-subtle)',
      textContent: label,
    }));

    const rowContainer = el('div', { style: 'margin-top:0.3rem' });

    if (isNA) {
      const row = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.4rem;font-size:0.82rem;border:1px dashed var(--border-subtle);border-radius:4px;background:var(--surface)',
      });
      row.appendChild(el('span', { style: 'flex:1;color:var(--text-3);font-style:italic', textContent: 'Not used' }));
      const undoBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.7rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--text-2)',
        textContent: 'Undo',
      });
      undoBtn.addEventListener('click', () => { delete naSlots[slotId]; renderStep(); });
      row.appendChild(undoBtn);
      rowContainer.appendChild(row);
    } else if (exerciseName) {
      const row = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.4rem;font-size:0.82rem;border:1px solid var(--border-subtle);border-radius:4px;background:var(--surface)',
      });
      row.appendChild(el('span', { style: 'flex:1;color:var(--text-1);font-weight:500', textContent: exerciseName }));
      const skipBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.7rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--text-3)',
        textContent: 'Skip',
      });
      skipBtn.addEventListener('click', () => { naSlots[slotId] = true; renderStep(); });
      const removeBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.7rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--danger)',
        textContent: '✕',
      });
      removeBtn.addEventListener('click', () => { delete optionalExercises[slotId]; delete naSlots[slotId]; renderStep(); });
      row.append(skipBtn, removeBtn);
      rowContainer.appendChild(row);
    } else {
      const emptyRow = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.4rem;font-size:0.78rem;border:1px dashed var(--border-subtle);border-radius:4px;margin-bottom:0.25rem;background:var(--surface)',
      });
      emptyRow.appendChild(el('span', { style: 'flex:1;color:var(--text-3);font-style:italic', textContent: 'No exercise selected' }));
      const skipBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.7rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--text-3)',
        textContent: 'Skip',
      });
      skipBtn.addEventListener('click', () => { naSlots[slotId] = true; renderStep(); });
      emptyRow.appendChild(skipBtn);
      rowContainer.appendChild(emptyRow);

      const addBtn = el('button', {
        type: 'button',
        className: 'btn btn-ghost',
        textContent: '+ Add exercise',
        style: 'font-size:0.78rem;align-self:flex-start',
      });
      addBtn.addEventListener('click', () => {
        const { close } = openModal({
          title: `Add ${label}`,
          content: renderFilteredExercisePicker(allLib, undefined, (ex) => {
            optionalExercises[slotId] = ex.name;
            close();
            renderStep();
          }),
          onClose: () => renderStep(),
        });
      });
      rowContainer.appendChild(addBtn);
    }

    container.appendChild(rowContainer);
  }

  // ── Fallback wizard for programs without setupGroups (legacy behavior) ──
  function renderFallbackAccessoryWizard(
    container: HTMLElement,
    prog: ProgramDefinition,
    accessoryValues: Record<string, string>,
    naSlots: Record<string, boolean>,
  ) {
    const accKeys = Object.keys(prog.accessoryOptions);
    if (accKeys.length === 0) return;

    const allAccExercises = new Map<string, ProgramExerciseDef>();
    const walkExercises = (weeks: typeof prog.weeks) => {
      for (const w of weeks) {
        for (const s of w.sessions) {
          for (const e of s.exercises) {
            if (e.accessoryGroup && !allAccExercises.has(e.accessoryGroup)) {
              allAccExercises.set(e.accessoryGroup, e);
            }
          }
        }
      }
    };
    walkExercises(prog.weeks);
    for (const v of prog.variants ?? []) walkExercises(v.weeks);

    const contextGroups = groupByContext([...allAccExercises.values()]);

    container.appendChild(el('p', { style: 'color:var(--text-2);font-size:0.9rem;margin-top:0.5rem' }, ['Choose your accessory exercises:']));

    for (const [contextLabel, exercises] of contextGroups) {
      container.appendChild(el('div', {
        style: 'font-weight:650;font-size:0.82rem;color:var(--accent);margin-top:0.4rem;padding:0.2rem 0;border-bottom:1px solid var(--border-subtle)',
        textContent: contextLabel,
      }));

      for (const ex of exercises) {
        const group = ex.accessoryGroup!;
        const options = prog.accessoryOptions[group] ?? [];
        const field = el('div', { className: 'field' });

        const labelParts: Array<string | HTMLElement> = [ex.optionalLabel ?? group];
        if (ex.naAllowed) {
          labelParts.push(el('span', { style: 'color:var(--text-3);font-size:0.75rem;font-weight:400', textContent: ' (optional)' }));
        }
        field.appendChild(el('label', {}, labelParts));

        const sel = el('select', { 'aria-label': group }) as HTMLSelectElement;
        if (ex.naAllowed) {
          sel.appendChild(el('option', { value: '__NA__', textContent: '— N/A / Don\'t use —' }));
        }
        for (const opt of options) {
          sel.appendChild(el('option', { value: opt, textContent: opt }));
        }

        const currentVal = accessoryValues[group];
        if (currentVal === '__NA__') {
          sel.value = '__NA__';
        } else if (currentVal) {
          sel.value = currentVal;
        } else if (options.length > 0) {
          sel.value = options[0]!;
          accessoryValues[group] = options[0]!;
        }

        sel.addEventListener('change', () => {
          accessoryValues[group] = sel.value;
          if (sel.value === '__NA__') {
            naSlots[ex.id] = true;
          } else {
            delete naSlots[ex.id];
          }
        });

        if (currentVal === '__NA__') naSlots[ex.id] = true;
        field.appendChild(sel);
        container.appendChild(field);
      }
    }
  }

  function renderFilteredExercisePicker(
    lib: Exercise[],
    _context: string | undefined,
    onPick: (ex: Exercise) => void,
  ): HTMLElement {
    const wrap = el('div', { className: 'stack' });
    const searchInp = el('input', {
      type: 'search',
      placeholder: 'Search exercises…',
      'aria-label': 'Search exercises',
    }) as HTMLInputElement;
    const results = el('div', { className: 'list' });

    const paintResults = (q: string) => {
      clear(results);
      let filtered = q.trim()
        ? lib.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
        : lib;
      // Optionally boost exercises matching context
      for (const ex of filtered.slice(0, 15)) {
        const btn = el('button', { type: 'button', className: 'list-item' });
        btn.appendChild(el('div', { className: 'title', textContent: ex.name }));
        btn.addEventListener('click', () => onPick(ex));
        results.appendChild(btn);
      }
    };

    searchInp.addEventListener('input', debounce(() => paintResults(searchInp.value), 120));
    paintResults('');

    const addBtn = el('button', {
      type: 'button',
      className: 'btn btn-ghost btn-block',
      textContent: '+ Add new exercise',
      style: 'margin-top:0.3rem',
    });
    addBtn.addEventListener('click', async () => {
      const cats = await listCategories();
      const catIds = cats.map((c) => c.id);
      const defaultCat = catIds[0] ?? '';
      if (!defaultCat) { toast('Create a category first'); return; }

      const nameInp = el('input', { type: 'text', placeholder: 'Exercise name', 'aria-label': 'Exercise name' }) as HTMLInputElement;
      const catSel = el('select', { 'aria-label': 'Category' }) as HTMLSelectElement;
      for (const c of cats) catSel.appendChild(el('option', { value: c.id, textContent: c.name }));

      const form = el('div', { className: 'field' });
      form.append(el('label', { textContent: 'Name' }), nameInp);
      const catField = el('div', { className: 'field' });
      catField.append(el('label', { textContent: 'Category' }), catSel);

      const { close: closeForm } = openModal({
        title: 'New exercise',
        content: el('div', { className: 'stack' }, [form, catField]),
        center: true,
        actions: [
          { label: 'Cancel', variant: 'ghost' },
          {
            label: 'Create',
            variant: 'primary',
            onClick: async () => {
              const name = nameInp.value.trim();
              if (!name) { toast('Name required'); return; }
              const ex = await createExercise({ name, categoryId: catSel.value, metric: 'weight_reps' });
              lib.push(ex);
              closeForm();
              onPick(ex);
            },
          },
        ],
      });
    });

    wrap.append(searchInp, results, addBtn);
    return wrap;
  }

  function renderMappingList(container: HTMLElement, progNames: string[]) {
    clear(container);
    for (const pn of progNames) {
      const mapped = exerciseMappings[pn];
      const mappedId = exerciseMappingIds[pn];
      const suggestion = mapped
        ? { name: mapped, id: mappedId ?? '', score: 100 }
        : suggestMatch(pn, allLib, undefined, programId);
      const suggestedName = suggestion?.name;

      const row = el('div', {
        style: 'display:flex;align-items:center;gap:0.4rem;padding:0.35rem 0;font-size:0.85rem;border-bottom:1px solid var(--border-subtle)',
      });
      const label = el('span', { style: 'flex:0 0 auto;font-weight:600;min-width:5rem', textContent: pn });
      const value = el('span', {
        style: `flex:1;color:${suggestedName ? 'var(--text-2)' : 'var(--danger)'}`,
        textContent: suggestedName ?? '— No match —',
      });
      const changeBtn = el('button', {
        type: 'button',
        style: 'padding:0.2rem 0.5rem;font-size:0.75rem;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:transparent;color:var(--text-2)',
        textContent: suggestedName ? 'Change' : 'Assign',
      });
      changeBtn.addEventListener('click', () => {
        const { close } = openModal({
          title: `Pick exercise for "${pn}"`,
          content: renderFilteredExercisePicker(allLib, undefined, (ex) => {
            exerciseMappings[pn] = ex.name;
            exerciseMappingIds[pn] = ex.id;
            saveMapping(pn, ex.id, ex.name, programId);
            close();
          }),
          onClose: () => renderMappingList(container, progNames),
        });
      });
      row.append(label, value, changeBtn);
      container.appendChild(row);
    }
  }

  const { close } = openModal({
    title: `Start ${prog.name}`,
    content: stepContent,
    center: true,
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Start program',
        variant: 'primary',
        onClick: async () => {
          const lifts = prog.liftInputs.map((name) => {
            const val = parseFloat(liftValues[name] ?? '') || 0;
            return { exerciseName: name, oneRM: val };
          });

          const accessories: Array<{ groupName: string; chosenExercise: string }> = [];
          const extraExercises: Record<string, Array<{ exerciseId: string; sets: number; reps: string }>> = {};

          if (prog.setupGroups && prog.setupGroups.length > 0) {
            // Flatten setupGroups into accessories array
            for (const group of prog.setupGroups) {
              for (const slot of group.slots) {
                if (slot.type === 'fixed') {
                  const val = accessoryValues[slot.id] ?? slot.default ?? slot.options[0];
                  if (val) {
                    accessories.push({ groupName: slot.id, chosenExercise: val });
                  }
                } else if (slot.type === 'optional') {
                  const exName = optionalExercises[slot.id] ?? '';
                  if (exName) {
                    accessories.push({ groupName: slot.id, chosenExercise: exName });
                  }
                }
              }
            }

            // Handle dynamic extra optional slots (added by user beyond the static ones)
            // These become extraExercises on every session that has optional slots
            for (const group of prog.setupGroups) {
              const extraCount = dynamicSlotCount[group.id] ?? 0;
              for (let i = 0; i < extraCount; i++) {
                const dynamicId = `${group.id}_extra_${i}`;
                const exName = optionalExercises[dynamicId] ?? '';
                if (!exName) continue;
                const libEx = allLib.find((e) => e.name === exName);
                if (!libEx) continue;
                // Add to every session that has optional exercise slots
                for (const week of prog.weeks) {
                  for (const session of week.sessions) {
                    const hasOptional = session.exercises.some((e) => e.role === 'optional');
                    if (!hasOptional) continue;
                    const list = extraExercises[session.id] ?? [];
                    list.push({
                      exerciseId: libEx.id,
                      sets: 3,
                      reps: '8-12',
                    });
                    extraExercises[session.id] = list;
                  }
                }
              }
            }
          } else {
            // Legacy: flatten accessoryOptions
            for (const groupName of Object.keys(prog.accessoryOptions)) {
              accessories.push({
                groupName,
                chosenExercise: accessoryValues[groupName] ?? prog.accessoryOptions[groupName]![0]!,
              });
            }
          }

          // Save accessory mappings to persistent memory
          for (const acc of accessories) {
            const matchingEx = allLib.find((e) => e.name === acc.chosenExercise);
            if (matchingEx) {
              saveAccessoryMapping(acc.groupName, matchingEx.id, matchingEx.name, programId);
            }
          }

          // Build exercise mappings using IDs (not names) so resolver can look up by ID
          const mappingsById: Record<string, string> = {};
          for (const [progName, exId] of Object.entries(exerciseMappingIds)) {
            if (exId) mappingsById[progName] = exId;
          }

          const config = createProgramConfig(programId, lifts, accessories, selectedVariantId, mappingsById, naSlots);
          // Set extraExercises on the config
          if (Object.keys(extraExercises).length > 0) {
            config.extraExercises = extraExercises;
            // Re-save with extras
            const configs = JSON.parse(localStorage.getItem('matrixnotes_programs') ?? '[]') as ProgramConfig[];
            const idx = configs.findIndex((c) => c.id === config.id);
            if (idx >= 0) {
              configs[idx] = config;
              localStorage.setItem('matrixnotes_programs', JSON.stringify(configs));
            }
          }
          close();
          toast(`Started "${prog.name}"`);
          router.navigate('program-detail', { configId: config.id });
        },
      },
    ],
  });

  renderStep();
}
