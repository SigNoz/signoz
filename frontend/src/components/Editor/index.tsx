import MEditor from '@monaco-editor/react';
import React from 'react';

function Editor({
	value,
	language = 'yaml',
	onChange,
}: EditorProps): JSX.Element {
	return (
		<MEditor
			theme="vs-dark"
			language={language}
			value={value}
			options={{ fontSize: 16, automaticLayout: true }}
			height="40vh"
			onChange={(newValue): void => {
				if (newValue) {
					onChange(newValue);
				}
			}}
		/>
	);
}

interface EditorProps {
	value: string;
	language?: string;
	onChange: (value: string) => void;
}

Editor.defaultProps = {
	language: undefined,
};

export default Editor;
