import { describe, it, expect, vi } from 'vitest';
vi.mock('wxt/browser', () => ({
  browser: { runtime: { getURL: () => 'https://mycourses.aalto.fi/' } },
}));
import {
  applyFormulaOperation,
  normalizeLibrary,
  normalizedName,
  searchFormulas,
  starterLibrary,
  FORMULA_LIMITS,
} from '../../src/features/formula-model';
import { validateLatex } from '../../src/features/formula-renderer';

describe('personal formula library', () => {
  it('starts with valid titled math/electrical references, with independent copies', () => {
    const first = starterLibrary();
    expect(first.subjects.map((s) => s.name)).toEqual([
      'Math',
      'Electrical Engineering',
    ]);
    for (const formula of first.formulas)
      expect(validateLatex(formula.latex), formula.title).toBeNull();
    first.formulas[0]!.title = 'Changed';
    expect(starterLibrary().formulas[0]!.title).toBe('Power rule');
  });
  it('keeps an explicitly empty library empty, rather than restoring deleted starters', () => {
    expect(
      normalizeLibrary({ version: 1, subjects: [], formulas: [] }),
    ).toEqual({ version: 1, subjects: [], formulas: [] });
    const source = starterLibrary();
    const afterMath = applyFormulaOperation(source, {
      type: 'delete-subject',
      id: 'math',
    });
    const empty = applyFormulaOperation(afterMath, {
      type: 'delete-subject',
      id: 'electrical',
    });
    expect(normalizeLibrary(empty).formulas).toEqual([]);
    expect(source.formulas.length).toBeGreaterThan(0);
  });
  it('filters malformed, duplicate and orphaned records without accepting extra properties', () => {
    const library = normalizeLibrary({
      version: 1,
      subjects: [
        { id: 'a', name: 'Math', html: '<script>' },
        { id: 'b', name: ' MATH ' },
        null,
      ],
      formulas: [
        { id: 'f', subjectId: 'a', title: 'Valid', latex: 'x', onclick: 'bad' },
        { id: 'f', subjectId: 'a', title: 'Duplicate', latex: 'y' },
        { id: 'g', subjectId: 'missing', title: 'Orphan', latex: 'y' },
        { id: 'h', subjectId: 'a', title: '', latex: 'y' },
      ],
    });
    expect(library.subjects).toEqual([{ id: 'a', name: 'Math' }]);
    expect(library.formulas).toEqual([
      { id: 'f', subjectId: 'a', title: 'Valid', latex: 'x' },
    ]);
  });
  it('rejects an unsupported saved schema so a save cannot silently overwrite it', () => {
    expect(() =>
      normalizeLibrary({ version: 2, subjects: [], formulas: [] }),
    ).toThrow('unsupported');
  });
  it('adds and edits subjects/formulas without mutating earlier snapshots', () => {
    const source = starterLibrary();
    const added = applyFormulaOperation(source, {
      type: 'subject',
      subject: { id: 'physics', name: ' Physics ' },
    });
    const withFormula = applyFormulaOperation(added, {
      type: 'formula',
      formula: {
        id: 'energy',
        subjectId: 'physics',
        title: 'Energy',
        latex: 'E=mc^2',
      },
    });
    const edited = applyFormulaOperation(withFormula, {
      type: 'formula',
      formula: {
        id: 'energy',
        subjectId: 'math',
        title: 'Mass energy',
        latex: 'E=mc^2',
      },
    });
    expect(source.subjects).toHaveLength(2);
    expect(withFormula.formulas.at(-1)?.subjectId).toBe('physics');
    expect(edited.formulas.at(-1)).toEqual({
      id: 'energy',
      subjectId: 'math',
      title: 'Mass energy',
      latex: 'E=mc^2',
    });
  });
  it('searches titles globally, ignoring the chosen subject and matching case/accents', () => {
    expect(
      searchFormulas(starterLibrary(), 'RÉSISTANCE SERIES', 'math').map(
        (f) => f.title,
      ),
    ).toEqual(['Resistance in series']);
    expect(
      searchFormulas(starterLibrary(), '', 'math').every(
        (f) => f.subjectId === 'math',
      ),
    ).toBe(true);
    expect(normalizedName('  A  B  ')).toBe('a b');
  });
  it('rejects empty, duplicate, oversized and deleted-subject edits', () => {
    const source = starterLibrary();
    expect(() =>
      applyFormulaOperation(source, {
        type: 'subject',
        subject: { id: 'new', name: 'math' },
      }),
    ).toThrow('already exists');
    expect(() =>
      applyFormulaOperation(source, {
        type: 'subject',
        subject: { id: 'new', name: ' ' },
      }),
    ).toThrow('subject name');
    expect(() =>
      applyFormulaOperation(source, {
        type: 'subject',
        subject: { id: 'new', name: 'x'.repeat(FORMULA_LIMITS.name + 1) },
      }),
    ).toThrow('subject name');
    expect(() =>
      applyFormulaOperation(source, {
        type: 'formula',
        formula: { id: 'x', subjectId: 'missing', title: 'X', latex: 'x' },
      }),
    ).toThrow('no longer exists');
  });
  it('rejects invalid/HTML/network LaTeX and bounded macro expansion failures', () => {
    for (const latex of [
      '',
      String.raw`\frac{a`,
      String.raw`\unknown{a}`,
      String.raw`\href{https://example.com}{x}`,
      String.raw`\includegraphics{https://example.com/a.png}`,
      String.raw`\htmlClass{bad}{x}`,
      String.raw`\def\a{\a}\a`,
      'x'.repeat(FORMULA_LIMITS.latex + 1),
    ])
      expect(validateLatex(latex)).not.toBeNull();
    expect(validateLatex(String.raw`\frac{x^2}{2}+C`)).toBeNull();
  });
});
