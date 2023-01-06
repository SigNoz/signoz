import MEditor, { EditorProps } from '@monaco-editor/react';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

function Editor({
	value,
	language,
	onChange,
	readOnly,
	height,
	options,
}: MEditorProps): JSX.Element {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
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
