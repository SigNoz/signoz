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
			onChange={(newValue): void => {
				if (value.current && newValue) {
					// eslint-disable-next-line no-param-reassign
					value.current = newValue;
				}
			}}
		/>
	);
}

interface EditorProps {
	value: React.MutableRefObject<string>;
}

export default Editor;
