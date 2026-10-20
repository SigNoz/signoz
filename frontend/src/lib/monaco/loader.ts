import { loader } from '@monaco-editor/react';

type LoaderInit = typeof loader.init;
type CancelableMonaco = ReturnType<LoaderInit>;

const CANCELATION = {
	type: 'cancelation',
	msg: 'operation is manually canceled',
};

const initLoader: LoaderInit = loader.init;
let monacoLoaded: Promise<void> | undefined;

// monaco-editor is about a third of the entry chunk, so it loads on the first editor
// mount instead of with the app. Every editor goes through @monaco-editor/react, whose
// components call `loader.init()` on mount; handing the loader the bundled instance
// before the original init runs keeps it from fetching Monaco from the CDN.
loader.init = (): CancelableMonaco => {
	monacoLoaded ??= import('./setup').then(({ monaco }) =>
		loader.config({ monaco }),
	);
	let canceled = false;
	const promise = monacoLoaded.then(() => {
		if (canceled) {
			throw CANCELATION;
		}
		return initLoader();
	}) as CancelableMonaco;
	promise.cancel = (): void => {
		canceled = true;
	};
	return promise;
};
