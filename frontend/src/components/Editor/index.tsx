import MEditor from '@monaco-editor/react';
import React from 'react';

function Editor({ value, readOnly = false }: EditorProps): JSX.Element {
	return (
		<MEditor
			theme="vs-dark"
			defaultLanguage="yaml"
			value={value.current}
			options={{ fontSize: 16, automaticLayout: true, readOnly }}
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
	readOnly?: boolean;
}

Editor.defaultProps = {
	readOnly: false,
};

export default Editor;
