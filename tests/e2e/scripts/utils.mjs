import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const E2E_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
);
export const REPO_DIR = path.resolve(E2E_DIR, '../..');
