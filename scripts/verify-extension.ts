import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Chromium's extension loader rejects Unicode noncharacters as well as bad UTF-8. */
export function assertExtensionText(bytes: Uint8Array, name: string): void {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(name + ': invalid UTF-8 bytes.');
  }
  for (const character of text) {
    const point = character.codePointAt(0)!;
    if ((point >= 0xfdd0 && point <= 0xfdef) || (point & 0xffff) >= 0xfffe)
      throw new Error(
        name +
          ': Chromium rejects literal U+' +
          point.toString(16).toUpperCase() +
          '. Escape it in the build.',
      );
  }
}

export async function verifyExtension(directory: string): Promise<number> {
  let checked = 0;
  async function visit(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (/\.(js|css|html|json)$/.test(entry.name)) {
        assertExtensionText(
          await readFile(file),
          path.relative(directory, file),
        );
        checked++;
      }
    }
  }
  await readFile(path.join(directory, 'manifest.json'));
  await visit(directory);
  return checked;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const checked = await verifyExtension(
    process.argv[2] ?? '.output/chrome-mv3',
  );
  console.log(
    'Extension encoding check passed for ' + checked + ' generated text files.',
  );
}
