export type Subject = { id: string; name: string };
export type Formula = {
  id: string;
  subjectId: string;
  title: string;
  latex: string;
};
export type FormulaLibrary = {
  version: 1;
  subjects: Subject[];
  formulas: Formula[];
};
export const FORMULA_KEY = 'betterMyCourses.formulaLibrary';
export const FORMULA_LIMITS = {
  subjects: 60,
  formulas: 500,
  name: 60,
  title: 100,
  latex: 2048,
} as const;

// Starter references, checked against OpenStax Calculus 1 and University Physics 2.
// Full source links are in docs/DESIGN.md; these are editable personal copies.
export function starterLibrary(): FormulaLibrary {
  const math = [
    ['Power rule', String.raw`\frac{d}{dx}x^n=nx^{n-1}`],
    ['Product rule', String.raw`(fg)'=f'g+fg'`],
    [
      'Quotient rule',
      String.raw`\left(\frac{f}{g}\right)'=\frac{f'g-fg'}{g^2},\quad g\ne0`,
    ],
    ['Chain rule', String.raw`\frac{d}{dx}f(g(x))=f'(g(x))\,g'(x)`],
    [
      'Trigonometric derivatives',
      String.raw`\frac{d}{dx}\sin x=\cos x,\qquad\frac{d}{dx}\cos x=-\sin x`,
    ],
    ['Exponential derivative', String.raw`\frac{d}{dx}e^x=e^x`],
    [
      'Logarithmic derivative',
      String.raw`\frac{d}{dx}\ln x=\frac{1}{x},\quad x>0`,
    ],
    [
      'Power integral',
      String.raw`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C,\quad n\ne-1`,
    ],
    ['Definite integral', String.raw`\int_a^b f(x)\,dx=F(b)-F(a),\quad F'=f`],
  ];
  const electrical = [
    ['Resistance in series', String.raw`R_{\mathrm{eq}}=R_1+R_2+\cdots+R_n`],
    [
      'Resistance in parallel',
      String.raw`\frac{1}{R_{\mathrm{eq}}}=\frac{1}{R_1}+\frac{1}{R_2}+\cdots+\frac{1}{R_n}`,
    ],
    [
      'Two resistors in parallel',
      String.raw`R_{\mathrm{eq}}=\frac{R_1R_2}{R_1+R_2}`,
    ],
  ];
  return {
    version: 1,
    subjects: [
      { id: 'math', name: 'Math' },
      { id: 'electrical', name: 'Electrical Engineering' },
    ],
    formulas: [
      ...math.map(([title, latex], i) => ({
        id: 'math-' + i,
        subjectId: 'math',
        title: title!,
        latex: latex!,
      })),
      ...electrical.map(([title, latex], i) => ({
        id: 'electrical-' + i,
        subjectId: 'electrical',
        title: title!,
        latex: latex!,
      })),
    ],
  };
}

export function normalizedName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}
function text(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' && value.trim().length > 0 && value.length <= max
  );
}
function id(value: unknown): value is string {
  return typeof value === 'string' && /^[\w-]{1,80}$/.test(value);
}
export function normalizeLibrary(value: unknown): FormulaLibrary {
  if (value === undefined || value === null) return starterLibrary();
  if (typeof value !== 'object')
    throw new Error('The saved formula library could not be read.');
  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    !Array.isArray(raw.subjects) ||
    !Array.isArray(raw.formulas)
  )
    throw new Error('The saved formula library uses an unsupported format.');
  const subjects: Subject[] = [];
  const formulas: Formula[] = [];
  const subjectIds = new Set<string>();
  const subjectNames = new Set<string>();
  for (const candidate of raw.subjects.slice(0, FORMULA_LIMITS.subjects)) {
    if (!candidate || typeof candidate !== 'object') continue;
    const s = candidate as Record<string, unknown>;
    if (
      !id(s.id) ||
      !text(s.name, FORMULA_LIMITS.name) ||
      subjectIds.has(s.id) ||
      subjectNames.has(normalizedName(s.name))
    )
      continue;
    subjects.push({ id: s.id, name: s.name.trim() });
    subjectIds.add(s.id);
    subjectNames.add(normalizedName(s.name));
  }
  const formulaIds = new Set<string>();
  for (const candidate of raw.formulas.slice(0, FORMULA_LIMITS.formulas)) {
    if (!candidate || typeof candidate !== 'object') continue;
    const f = candidate as Record<string, unknown>;
    if (
      !id(f.id) ||
      !id(f.subjectId) ||
      !subjectIds.has(f.subjectId) ||
      formulaIds.has(f.id) ||
      !text(f.title, FORMULA_LIMITS.title) ||
      !text(f.latex, FORMULA_LIMITS.latex)
    )
      continue;
    formulas.push({
      id: f.id,
      subjectId: f.subjectId,
      title: f.title.trim(),
      latex: f.latex.trim(),
    });
    formulaIds.add(f.id);
  }
  return { version: 1, subjects, formulas };
}
export type FormulaOperation =
  | { type: 'subject'; subject: Subject }
  | { type: 'formula'; formula: Formula }
  | { type: 'delete-subject'; id: string }
  | { type: 'delete-formula'; id: string };

export function applyFormulaOperation(
  source: FormulaLibrary,
  operation: FormulaOperation,
): FormulaLibrary {
  const library = normalizeLibrary(source);
  if (operation.type === 'subject') {
    const subject = operation.subject;
    if (!id(subject.id) || !text(subject.name, FORMULA_LIMITS.name))
      throw new Error('Enter a subject name of up to 60 characters.');
    if (
      library.subjects.some(
        (s) =>
          s.id !== subject.id &&
          normalizedName(s.name) === normalizedName(subject.name),
      )
    )
      throw new Error('A subject with that name already exists.');
    const existing = library.subjects.findIndex((s) => s.id === subject.id);
    if (existing < 0 && library.subjects.length >= FORMULA_LIMITS.subjects)
      throw new Error('The library can hold up to 60 subjects.');
    const next = { ...subject, name: subject.name.trim() };
    if (existing < 0) library.subjects.push(next);
    else library.subjects[existing] = next;
  } else if (operation.type === 'formula') {
    const formula = operation.formula;
    if (
      !id(formula.id) ||
      !text(formula.title, FORMULA_LIMITS.title) ||
      !text(formula.latex, FORMULA_LIMITS.latex)
    )
      throw new Error(
        'Enter a title and a LaTeX formula within the displayed limits.',
      );
    if (!library.subjects.some((s) => s.id === formula.subjectId))
      throw new Error('That subject no longer exists. Choose another.');
    const existing = library.formulas.findIndex((f) => f.id === formula.id);
    if (existing < 0 && library.formulas.length >= FORMULA_LIMITS.formulas)
      throw new Error('The library can hold up to 500 formulas.');
    const next = {
      ...formula,
      title: formula.title.trim(),
      latex: formula.latex.trim(),
    };
    if (existing < 0) library.formulas.push(next);
    else library.formulas[existing] = next;
  } else if (operation.type === 'delete-subject') {
    library.subjects = library.subjects.filter((s) => s.id !== operation.id);
    library.formulas = library.formulas.filter(
      (f) => f.subjectId !== operation.id,
    );
  } else
    library.formulas = library.formulas.filter((f) => f.id !== operation.id);
  return library;
}

/** A title search spans every subject, even while a subject filter is selected. */
export function searchFormulas(
  library: FormulaLibrary,
  query: string,
  subjectId = '',
): Formula[] {
  const words = normalizedName(query).split(' ').filter(Boolean);
  return library.formulas.filter((formula) =>
    words.length
      ? words.every((word) => normalizedName(formula.title).includes(word))
      : !subjectId || formula.subjectId === subjectId,
  );
}
