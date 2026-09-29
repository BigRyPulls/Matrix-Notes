import { el, clear } from '../../utils/dom';
import { getConfig, getProgramById, getVariantLabel, getEffectiveWeeks, isSessionDone, resolveSessionExercises } from '../../services/program.service';
import { exerciseRepo } from '../../storage/repositories';
import { router } from '../router';

export async function renderProgramDetailScreen(root: HTMLElement, params: Record<string, string>): Promise<void> {
  clear(root);
  const configId = params['configId'];
  if (!configId) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Program not found' }));
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

  const shell = el('div', { className: 'screen-enter stack' });
  root.appendChild(shell);

  const allExercises = await exerciseRepo.getAll();
  const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));

  const paint = async () => {
    clear(shell);

    const refreshed = getConfig(configId);
    if (!refreshed) return;

    const head = el('div', { className: 'panel panel-pad' });
    head.appendChild(el('div', { style: 'font-weight:700;font-size:1.1rem', textContent: program.name }));
    const variantLabel = getVariantLabel(program, refreshed);
    if (variantLabel) {
      head.appendChild(el('div', { style: 'color:var(--accent);font-size:0.82rem;font-weight:600;margin-top:0.1rem', textContent: variantLabel }));
    }
    head.appendChild(el('div', { style: 'color:var(--text-3);font-size:0.8rem;margin-top:0.2rem' }, [
      `Started ${refreshed.startDate} · ${refreshed.weightUnit}`
    ]));

    const lifts = refreshed.lifts.map((l) => `${l.exerciseName}: ${l.oneRM} ${refreshed.weightUnit}`).join(' · ');
    head.appendChild(el('div', { style: 'color:var(--text-2);font-size:0.82rem;margin-top:0.3rem' }, [lifts]));

    const accs = refreshed.accessoryChoices
      .filter((a) => a.chosenExercise !== '__NA__')
      .map((a) => a.chosenExercise).join(', ');
    if (accs) {
      head.appendChild(el('div', { style: 'color:var(--text-3);font-size:0.78rem;margin-top:0.15rem' }, [accs]));
    }

    shell.appendChild(head);

    const weeks = getEffectiveWeeks(program, refreshed);
    if (weeks.length === 0) {
      shell.appendChild(el('div', { className: 'empty', textContent: 'No weeks defined' }));
      return;
    }

    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi]!;
      const weekCard = el('div', { className: 'panel', style: 'overflow:hidden' });

      const weekHead = el('div', {
        style: 'padding:0.7rem 0.85rem;font-weight:650;font-size:0.92rem;border-bottom:1px solid var(--border-subtle);background:var(--bg-panel-2);display:flex;justify-content:space-between;align-items:center',
      });
      weekHead.appendChild(el('span', { textContent: week.label }));

      const sessionsDone = week.sessions.filter((s) => isSessionDone(refreshed, s.id)).length;
      const totalSessions = week.sessions.length;
      weekHead.appendChild(el('span', {
        style: 'font-size:0.78rem;color:var(--text-3);font-weight:600',
        textContent: `${sessionsDone}/${totalSessions}`,
      }));

      weekCard.appendChild(weekHead);

      for (const session of week.sessions) {
        const done = isSessionDone(refreshed, session.id);

        // Resolve exercises to show real names and filter N/A
        const resolved = resolveSessionExercises(program, refreshed, session, exerciseMap);
        const activeExercises = resolved.filter((e) => !e.isNA);

        const row = el('button', {
          type: 'button',
          className: 'list-item',
          style: 'cursor:pointer;border:none;border-radius:0;border-bottom:1px solid var(--border-subtle);background:transparent',
        });
        const dot = el('span', {
          style: `width:10px;height:10px;border-radius:50%;flex:0 0 auto;background:${done ? 'var(--accent)' : 'var(--text-3)'};opacity:${done ? '1' : '0.3'}`,
        });
        const mid = el('div', { style: 'flex:1;text-align:left' });
        mid.append(
          el('div', { className: 'title', style: `font-size:0.9rem;${done ? 'color:var(--accent)' : ''}`, textContent: session.name }),
          el('div', { className: 'meta', textContent: `${activeExercises.length} exercises` }),
        );
        row.append(dot, mid);
        if (done) {
          row.appendChild(el('span', { style: 'color:var(--accent);font-size:0.82rem', textContent: '✓' }));
        }
        row.addEventListener('click', () => router.navigate('program-session', { configId: configId!, sessionId: session.id, weekIndex: String(wi) }));
        weekCard.appendChild(row);
      }

      shell.appendChild(weekCard);
    }
  };

  paint();
}
