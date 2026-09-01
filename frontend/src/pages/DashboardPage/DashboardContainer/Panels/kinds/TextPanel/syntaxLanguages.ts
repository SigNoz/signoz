import { PrismLight } from 'react-syntax-highlighter';

type PrismLanguage = Parameters<typeof PrismLight.registerLanguage>[1];
type LanguageLoader = () => Promise<{ default: PrismLanguage }>;

// One dynamic import per language, so each becomes its own chunk and a panel pays
// only for the languages its fences actually name.
const LOADERS: Record<string, LanguageLoader> = {
	bash: () => import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
	css: () => import('react-syntax-highlighter/dist/esm/languages/prism/css'),
	diff: () => import('react-syntax-highlighter/dist/esm/languages/prism/diff'),
	docker: () => import('react-syntax-highlighter/dist/esm/languages/prism/docker'),
	go: () => import('react-syntax-highlighter/dist/esm/languages/prism/go'),
	java: () => import('react-syntax-highlighter/dist/esm/languages/prism/java'),
	javascript: () =>
		import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
	json: () => import('react-syntax-highlighter/dist/esm/languages/prism/json'),
	markup: () => import('react-syntax-highlighter/dist/esm/languages/prism/markup'),
	python: () => import('react-syntax-highlighter/dist/esm/languages/prism/python'),
	rust: () => import('react-syntax-highlighter/dist/esm/languages/prism/rust'),
	sql: () => import('react-syntax-highlighter/dist/esm/languages/prism/sql'),
	typescript: () =>
		import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
	yaml: () => import('react-syntax-highlighter/dist/esm/languages/prism/yaml'),
};

const ALIASES: Record<string, string> = {
	dockerfile: 'docker',
	html: 'markup',
	js: 'javascript',
	py: 'python',
	sh: 'bash',
	shell: 'bash',
	ts: 'typescript',
	xml: 'markup',
	yml: 'yaml',
};

const registered = new Set<string>();
const inFlight = new Map<string, Promise<boolean>>();

/** The name Prism knows a fence's language by, or null if it knows none. */
export function resolveLanguage(name: string): string | null {
	const canonical = ALIASES[name] ?? name;
	return canonical in LOADERS ? canonical : null;
}

export function isLanguageRegistered(name: string): boolean {
	return registered.has(name);
}

/**
 * Resolves to whether `name` is registered and ready to highlight with. Concurrent
 * callers share one import, so a dashboard of same-language fences fetches once.
 */
export function loadLanguage(name: string): Promise<boolean> {
	if (registered.has(name)) {
		return Promise.resolve(true);
	}

	const pending = inFlight.get(name);
	if (pending) {
		return pending;
	}

	const loader = LOADERS[name];
	if (!loader) {
		return Promise.resolve(false);
	}

	const request = loader()
		.then((module) => {
			PrismLight.registerLanguage(name, module.default);
			registered.add(name);
			return true;
		})
		.catch(() => false)
		.finally(() => {
			inFlight.delete(name);
		});

	inFlight.set(name, request);
	return request;
}

export default PrismLight;
