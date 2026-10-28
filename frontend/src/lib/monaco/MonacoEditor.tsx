import { useCallback } from 'react';
import MEditor, { EditorProps, Monaco } from '@monaco-editor/react';

import { EDITOR_THEME, registerEditorTheme } from './editorTheme';

export type MonacoEditorProps = Omit<EditorProps, 'theme'>;

function MonacoEditor({
	beforeMount,
	...props
}: MonacoEditorProps): JSX.Element {
	const handleBeforeMount = useCallback(
		(monaco: Monaco): void => {
			registerEditorTheme(monaco);
			beforeMount?.(monaco);
		},
		[beforeMount],
	);

	return (
		<MEditor {...props} theme={EDITOR_THEME} beforeMount={handleBeforeMount} />
	);
}

export default MonacoEditor;
