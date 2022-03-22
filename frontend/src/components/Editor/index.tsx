import MEditor from '@monaco-editor/react';
import React from 'react';

function Editor({ value }: EditorProps): JSX.Element {
	return (
		<MEditor
			theme="vs-dark"
			defaultLanguage="yaml"
			value={value.current}
			options={{ fontSize: 16, automaticLayout: true }}
			height="40vh"
		/>
	);
}

interface EditorProps {
	value: React.MutableRefObject<string>;
}

export default Editor;
