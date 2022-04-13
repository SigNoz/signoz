import MEditor from '@monaco-editor/react';
import React from 'react';

function Editor({ value, language = 'yaml' }: EditorProps): JSX.Element {
	return (
		<MEditor
			theme="vs-dark"
			language={language}
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
	language?: string;
}

Editor.defaultProps = {
	language: undefined,
};

export default Editor;
