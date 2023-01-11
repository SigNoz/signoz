import MEditor, { EditorProps } from '@monaco-editor/react';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React from 'react';

function Editor({
	value,
	language,
	onChange,
	readOnly,
	height,
	options,
}: MEditorProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<MEditor
			theme={isDarkMode ? 'vs-dark' : 'vs-light'}
			language={language}
			value={value}
			options={{ fontSize: 16, automaticLayout: true, readOnly, ...options }}
			height={height}
			onChange={(newValue): void => {
				if (typeof newValue === 'string') onChange(newValue);
			}}
		/>
	);
}

interface MEditorProps {
	value: string;
	language?: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
	height?: string;
	options?: EditorProps['options'];
}

Editor.defaultProps = {
	language: 'yaml',
	readOnly: false,
	height: '40vh',
	options: {},
};

export default Editor;
