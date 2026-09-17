// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error redux-mock-store ships no types for its deep entry, which is
// the one that has to be imported here: aliasing the bare specifier to this file
// would otherwise make it import itself.
import * as mockStoreModule from 'redux-mock-store/lib/index.js';

type ConfigureStore = typeof import('redux-mock-store').default;

// rolldown-vite's dependency pre-bundler emits `export default require_lib()`
// for a CommonJS module that sets `__esModule`, so the default import lands on
// the module record instead of on its `default` export. Unwrap whichever shape
// arrives, so the same helper works under jsdom and browser mode.
const candidate = (
	mockStoreModule as unknown as {
		default: ConfigureStore | { default: ConfigureStore };
	}
).default;

const configureStore: ConfigureStore =
	typeof candidate === 'function' ? candidate : candidate.default;

export default configureStore;
