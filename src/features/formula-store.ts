import { browser } from 'wxt/browser';
import {
  FORMULA_KEY,
  normalizeLibrary,
  applyFormulaOperation,
  type FormulaOperation,
  type FormulaLibrary,
} from './formula-model';

export async function readFormulaLibrary(): Promise<FormulaLibrary> {
  const result = await browser.storage.local.get(FORMULA_KEY);
  return normalizeLibrary(result[FORMULA_KEY]);
}
export async function saveFormulaOperation(
  operation: FormulaOperation,
): Promise<FormulaLibrary> {
  // Serialize same-origin tabs, and re-read under the lock to retain other edits.
  return navigator.locks.request(FORMULA_KEY, async () => {
    const next = applyFormulaOperation(await readFormulaLibrary(), operation);
    await browser.storage.local.set({ [FORMULA_KEY]: next });
    return next;
  });
}
export function watchFormulaLibrary(
  onChange: (library: FormulaLibrary) => void,
  onError: (message: string) => void,
): () => void {
  const listener: Parameters<
    typeof browser.storage.onChanged.addListener
  >[0] = (changes, area) => {
    if (area !== 'local' || !(FORMULA_KEY in changes)) return;
    try {
      onChange(normalizeLibrary(changes[FORMULA_KEY]?.newValue));
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'The saved library could not be read.',
      );
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
