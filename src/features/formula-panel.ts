import plus from '@phosphor-icons/core/assets/regular/plus.svg?raw';
import pencil from '@phosphor-icons/core/assets/regular/pencil.svg?raw';
import trash from '@phosphor-icons/core/assets/regular/trash.svg?raw';
import { assistButton } from './assist-ui';
import {
  FORMULA_LIMITS,
  searchFormulas,
  type Formula,
  type FormulaLibrary,
  type FormulaOperation,
  type Subject,
} from './formula-model';
import {
  readFormulaLibrary,
  saveFormulaOperation,
  watchFormulaLibrary,
} from './formula-store';
import { validateLatex, type FormulaRenderer } from './formula-renderer';

function field(label: string, control: HTMLElement): HTMLLabelElement {
  const element = document.createElement('label');
  element.append(document.createTextNode(label), control);
  return element;
}

export function createFormulaPanel(
  renderer: FormulaRenderer,
  onPin: (formula: Formula, subject: Subject) => string | null,
  onLibrary: (library: FormulaLibrary) => void,
) {
  const element = document.createElement('div');
  element.className = 'bmc-formula-panel';
  const search = document.createElement('input');
  search.type = 'search';
  search.maxLength = 100;
  search.setAttribute('aria-label', 'Search formulas');
  search.placeholder = 'Search every formula by title';
  const navigation = document.createElement('div');
  navigation.className = 'bmc-formula-actions';
  const subjects = document.createElement('select');
  subjects.setAttribute('aria-label', 'Subject');
  const addSubject = assistButton('Add subject', plus);
  const addFormula = assistButton('Add formula', plus);
  const editSubject = assistButton('', pencil);
  editSubject.setAttribute('aria-label', 'Rename selected subject');
  editSubject.title = 'Rename selected subject';
  const deleteSubject = assistButton('', trash);
  deleteSubject.setAttribute('aria-label', 'Delete selected subject');
  deleteSubject.title = 'Delete selected subject';
  navigation.append(
    subjects,
    editSubject,
    deleteSubject,
    addSubject,
    addFormula,
  );
  const note = document.createElement('p');
  note.className = 'bmc-formula-note';
  note.textContent =
    'Click a formula to place it on screen. Your library stays on this device.';
  const notice = document.createElement('p');
  notice.className = 'bmc-formula-notice';
  notice.setAttribute('role', 'status');
  const retry = assistButton('Retry loading');
  retry.hidden = true;
  const editor = document.createElement('div');
  editor.className = 'bmc-formula-editor';
  const results = document.createElement('div');
  results.className = 'bmc-formula-results';
  element.append(search, navigation, note, notice, retry, editor, results);
  let library: FormulaLibrary | undefined;
  let busy = false;
  let disposed = false;
  let revision = 0;
  let formulaSubject: HTMLSelectElement | undefined;
  let previewFrame = 0;
  let pendingFocus = false;

  function message(value: string, error = false): void {
    notice.textContent = value;
    notice.dataset.error = String(error);
  }
  function subjectOptions(
    select: HTMLSelectElement,
    all: boolean,
    selected = select.value,
  ): void {
    select.replaceChildren();
    if (all || !library?.subjects.some((s) => s.id === selected)) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = all ? 'All subjects' : 'Choose a subject';
      select.append(option);
    }
    for (const subject of library?.subjects ?? []) {
      const option = document.createElement('option');
      option.value = subject.id;
      option.textContent = subject.name;
      select.append(option);
    }
    select.value = library?.subjects.some((s) => s.id === selected)
      ? selected
      : '';
  }
  function controls(): void {
    for (const control of element.querySelectorAll<
      | HTMLInputElement
      | HTMLButtonElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >('button,input,select,textarea'))
      control.disabled = busy || !library;
    retry.disabled = busy;
    addFormula.disabled = busy || !library?.subjects.length;
    editSubject.disabled = deleteSubject.disabled = busy || !subjects.value;
  }
  function resetEditor(): void {
    cancelAnimationFrame(previewFrame);
    previewFrame = 0;
    editor.replaceChildren();
    formulaSubject = undefined;
  }
  function list(): void {
    results.replaceChildren();
    if (!library) return;
    const formulas = searchFormulas(library, search.value, subjects.value);
    const count = document.createElement('p');
    count.className = 'bmc-formula-count';
    const quantity = formulas.length === 1 ? 'formula' : 'formulas';
    count.textContent = search.value.trim()
      ? formulas.length + ' matching ' + quantity + ' across all subjects'
      : formulas.length + ' ' + quantity;
    results.append(count);
    if (!formulas.length) {
      const empty = document.createElement('p');
      empty.className = 'bmc-formula-empty';
      empty.textContent = search.value.trim()
        ? 'No matching titles. Try another search.'
        : library.subjects.length
          ? 'No formulas here yet. Add your first formula.'
          : 'Add a subject to start your library.';
      results.append(empty);
    }
    for (const formula of formulas.slice(0, 50)) {
      const subject = library.subjects.find((s) => s.id === formula.subjectId)!;
      const row = document.createElement('div');
      row.className = 'bmc-formula-row';
      const place = assistButton('');
      place.className = 'bmc-formula-place';
      place.setAttribute('aria-label', 'Place ' + formula.title + ' on screen');
      const title = document.createElement('strong');
      title.textContent = formula.title;
      const category = document.createElement('span');
      category.className = 'bmc-formula-category';
      category.textContent = subject.name;
      const math = document.createElement('div');
      math.className = 'bmc-formula-math';
      math.setAttribute('aria-hidden', 'true');
      const error = renderer.render(math, formula.latex);
      if (error) math.hidden = true;
      place.append(title, category, math);
      if (error) {
        const invalid = document.createElement('span');
        invalid.className = 'bmc-formula-error';
        invalid.textContent = 'Invalid LaTeX. Edit to repair this formula.';
        place.append(invalid);
      }
      place.addEventListener('click', () => {
        const error = onPin(formula, subject);
        message(
          error ??
            'Formula placed. Drag its title or use the arrow keys to move it.',
          !!error,
        );
      });
      const actions = document.createElement('div');
      actions.className = 'bmc-formula-row-actions';
      const edit = assistButton('', pencil);
      edit.setAttribute('aria-label', 'Edit ' + formula.title);
      edit.title = 'Edit formula';
      edit.addEventListener('click', () => formulaEditor(formula));
      const remove = assistButton('', trash);
      remove.setAttribute('aria-label', 'Delete ' + formula.title);
      remove.title = 'Delete formula';
      remove.addEventListener('click', () =>
        confirmDelete('Delete “' + formula.title + '” from your library?', {
          type: 'delete-formula',
          id: formula.id,
        }),
      );
      actions.append(edit, remove);
      row.append(place, actions);
      results.append(row);
    }
    if (formulas.length > 50) {
      const more = document.createElement('p');
      more.className = 'bmc-formula-note';
      more.textContent =
        'Showing the first 50. Narrow your search to find more.';
      results.append(more);
    }
    controls();
  }
  function receive(value: FormulaLibrary): void {
    if (disposed) return;
    library = value;
    retry.hidden = true;
    subjectOptions(subjects, true);
    if (formulaSubject) subjectOptions(formulaSubject, false);
    onLibrary(value);
    list();
    controls();
    if (pendingFocus && element.getBoundingClientRect().height) {
      pendingFocus = false;
      search.focus({ preventScroll: true });
    }
  }
  async function save(
    operation: FormulaOperation,
    after?: () => void,
  ): Promise<void> {
    if (busy || disposed) return;
    busy = true;
    controls();
    message('Saving…');
    try {
      const next = await saveFormulaOperation(operation);
      if (disposed) return;
      receive(next);
      resetEditor();
      after?.();
      list();
      message('Saved on this device.');
    } catch (error) {
      if (!disposed)
        message(
          error instanceof Error
            ? error.message
            : 'Could not save. Please try again.',
          true,
        );
    } finally {
      busy = false;
      if (!disposed) {
        controls();
        if (!editor.childElementCount && element.getBoundingClientRect().height)
          addFormula.focus({ preventScroll: true });
      }
    }
  }
  function cancel(): void {
    resetEditor();
    addFormula.focus({ preventScroll: true });
  }
  function actions(form: HTMLElement, saveButton: HTMLButtonElement): void {
    const row = document.createElement('div');
    row.className = 'bmc-formula-actions';
    const close = assistButton('Cancel');
    close.addEventListener('click', cancel);
    row.append(saveButton, close);
    form.append(row);
  }
  function subjectEditor(subject?: Subject): void {
    resetEditor();
    message('');
    const form = document.createElement('form');
    form.className = 'bmc-formula-form';
    const title = document.createElement('h3');
    title.textContent = subject ? 'Rename subject' : 'Add subject';
    const name = document.createElement('input');
    name.type = 'text';
    name.maxLength = FORMULA_LIMITS.name;
    name.required = true;
    name.value = subject?.name ?? '';
    const submit = assistButton('Save subject');
    submit.type = 'submit';
    form.append(title, field('Subject name', name));
    actions(form, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const id = subject?.id ?? crypto.randomUUID();
      void save({ type: 'subject', subject: { id, name: name.value } }, () => {
        subjects.value = id;
        search.value = '';
      });
    });
    editor.append(form);
    name.focus();
  }
  function formulaEditor(formula?: Formula): void {
    if (!library?.subjects.length) return;
    resetEditor();
    message('');
    const form = document.createElement('form');
    form.className = 'bmc-formula-form';
    const heading = document.createElement('h3');
    heading.textContent = formula ? 'Edit formula' : 'Add formula';
    const category = document.createElement('select');
    category.setAttribute('aria-label', 'Formula subject');
    category.required = true;
    subjectOptions(
      category,
      false,
      formula?.subjectId ?? (subjects.value || library.subjects[0]!.id),
    );
    formulaSubject = category;
    const title = document.createElement('input');
    title.type = 'text';
    title.maxLength = FORMULA_LIMITS.title;
    title.required = true;
    title.value = formula?.title ?? '';
    const latex = document.createElement('textarea');
    latex.maxLength = FORMULA_LIMITS.latex;
    latex.rows = 3;
    latex.required = true;
    latex.spellcheck = false;
    latex.value = formula?.latex ?? '';
    latex.placeholder = String.raw`R_{\mathrm{eq}}=R_1+R_2`;
    const hint = document.createElement('p');
    hint.className = 'bmc-formula-note';
    hint.textContent =
      'Math LaTeX without $ delimiters. Up to 2048 characters.';
    const previewLabel = document.createElement('h4');
    previewLabel.textContent = 'Preview';
    const preview = document.createElement('div');
    preview.className = 'bmc-formula-preview bmc-formula-math';
    const error = document.createElement('p');
    error.className = 'bmc-formula-error';
    error.setAttribute('role', 'status');
    const submit = assistButton('Save formula');
    submit.type = 'submit';
    function refresh(): void {
      previewFrame = 0;
      const problem = renderer.render(preview, latex.value);
      error.textContent = latex.value.trim()
        ? (problem ?? '')
        : 'Type a formula to see a preview.';
    }
    latex.addEventListener('input', () => {
      cancelAnimationFrame(previewFrame);
      previewFrame = requestAnimationFrame(refresh);
    });
    form.append(
      heading,
      field('Formula subject', category),
      field('Formula title', title),
      field('LaTeX', latex),
      hint,
      previewLabel,
      preview,
      error,
    );
    actions(form, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const problem = validateLatex(latex.value);
      if (problem) {
        error.textContent = problem;
        latex.focus();
        return;
      }
      void save({
        type: 'formula',
        formula: {
          id: formula?.id ?? crypto.randomUUID(),
          subjectId: category.value,
          title: title.value,
          latex: latex.value,
        },
      });
    });
    editor.append(form);
    refresh();
    title.focus();
  }
  function confirmDelete(text: string, operation: FormulaOperation): void {
    resetEditor();
    message('');
    const note = document.createElement('p');
    note.textContent = text;
    const remove = assistButton('Delete');
    remove.addEventListener('click', () => void save(operation));
    editor.append(note);
    actions(editor, remove);
    remove.focus();
  }
  search.addEventListener('input', list);
  subjects.addEventListener('change', () => {
    search.value = '';
    list();
  });
  addSubject.addEventListener('click', () => subjectEditor());
  addFormula.addEventListener('click', () => formulaEditor());
  editSubject.addEventListener('click', () =>
    subjectEditor(library?.subjects.find((s) => s.id === subjects.value)),
  );
  deleteSubject.addEventListener('click', () => {
    const subject = library?.subjects.find((s) => s.id === subjects.value);
    if (!subject || !library) return;
    const count = library.formulas.filter(
      (f) => f.subjectId === subject.id,
    ).length;
    confirmDelete(
      'Delete “' + subject.name + '” and its ' + count + ' formulas?',
      { type: 'delete-subject', id: subject.id },
    );
  });
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && editor.childElementCount) {
      event.preventDefault();
      cancel();
    }
  });
  const unwatch = watchFormulaLibrary(
    (value) => {
      revision++;
      receive(value);
    },
    (error) => message(error, true),
  );
  async function load(): Promise<void> {
    const initial = revision;
    message('Loading your formula library…');
    controls();
    retry.hidden = true;
    try {
      const value = await readFormulaLibrary();
      if (!disposed && revision === initial) {
        receive(value);
        message('');
      }
    } catch (error) {
      if (!disposed) {
        message(
          error instanceof Error
            ? error.message
            : 'Could not load your library.',
          true,
        );
        retry.hidden = false;
        controls();
      }
    }
  }
  retry.addEventListener('click', () => void load());
  void load();
  return {
    element,
    focus() {
      pendingFocus = !library;
      if (library) search.focus({ preventScroll: true });
    },
    dispose() {
      disposed = true;
      unwatch();
      cancelAnimationFrame(previewFrame);
      element.remove();
    },
  };
}
