import { lazy, Suspense } from 'react';
import type { EditorProps } from '@monaco-editor/react';
import Spinner from 'components/Spinner';

const MonacoEditorImpl = lazy(() => import('./MonacoEditorImpl'));

function MonacoEditor(props: EditorProps): JSX.Element {
	return (
		<Suspense fallback={<Spinner />}>
			<MonacoEditorImpl {...props} />
		</Suspense>
	);
}

export default MonacoEditor;
