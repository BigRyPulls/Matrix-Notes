import { RELEASE_NOTES, HOTFIXES } from '../../data/release-notes';
import { el, clear } from '../../utils/dom';

export function renderReleaseNotesScreen(root: HTMLElement): void {
  clear(root);
  const shell = el('div', { className: 'screen-enter stack' });
  shell.appendChild(
    el('p', { style: 'color:var(--text-3);font-size:0.85rem' }, [
      'Release history and hotfixes for MatrixNotes.',
    ]),
  );

  for (const rn of RELEASE_NOTES) {
    const card = el('div', { className: 'panel panel-pad', style: 'margin-bottom:0.4rem' });
    const head = el('div', {
      style: 'display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.3rem',
    });
    const versionBadge = el('span', {
      style: `font-size:0.72rem;font-weight:700;padding:0.1rem 0.4rem;border-radius:3px;background:${rn.type === 'hotfix' ? 'var(--danger)' : 'var(--accent)'};color:var(--text-inv)`,
      textContent: `v${rn.version}`,
    });
    head.append(versionBadge, el('span', { style: 'font-size:0.88rem;font-weight:650', textContent: rn.title }));
    head.appendChild(el('span', { style: 'margin-left:auto;font-size:0.72rem;color:var(--text-3)', textContent: rn.date }));
    card.appendChild(head);

    const list = el('ul', { style: 'margin:0.25rem 0;padding-left:1.1rem;font-size:0.82rem;line-height:1.6' });
    for (const item of rn.items) {
      list.appendChild(el('li', { textContent: item }));
    }
    card.appendChild(list);

    // Hotfixes for this version
    const hfs = HOTFIXES.filter((h) => h.version === rn.version);
    if (hfs.length > 0) {
      const hfSection = el('div', { style: 'margin-top:0.2rem;padding-top:0.2rem;border-top:1px solid var(--border-subtle)' });
      for (const hf of hfs) {
        hfSection.appendChild(
          el('div', {
            style: 'font-size:0.78rem;color:var(--text-2);padding:0.15rem 0',
            textContent: `HF${hf.number} (${hf.date}) — ${hf.description}`,
          }),
        );
      }
      card.appendChild(hfSection);
    }

    shell.appendChild(card);
  }

  // Standalone hotfixes (for versions not in RELEASE_NOTES)
  const orphanHf = HOTFIXES.filter((h) => !RELEASE_NOTES.some((r) => r.version === h.version));
  if (orphanHf.length > 0) {
    const hfPanel = el('div', { className: 'panel panel-pad', style: 'margin-top:0.3rem' });
    hfPanel.appendChild(el('div', { style: 'font-weight:650;font-size:0.85rem;margin-bottom:0.25rem', textContent: 'Hotfixes' }));
    for (const hf of orphanHf) {
      hfPanel.appendChild(
        el('div', {
          style: 'font-size:0.78rem;color:var(--text-2);padding:0.15rem 0',
          textContent: `v${hf.version} HF${hf.number} (${hf.date}) — ${hf.description}`,
        }),
      );
    }
    shell.appendChild(hfPanel);
  }

  root.appendChild(shell);
}
