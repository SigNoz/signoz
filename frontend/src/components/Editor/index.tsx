import MEditor from '@monaco-editor/react';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

function Editor({
	value,
	language = 'yaml',
	onChange,
	readOnly = false,
	height = '40vh',
}: EditorProps): JSX.Element {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	return (
		<MEditor
			theme={isDarkMode ? 'vs-dark' : 'vs-light'}
			language={language}
			value={value}
			options={{ fontSize: 16, automaticLayout: true, readOnly }}
			height={height}
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
	readOnly?: boolean;
	height?: string;
}

Editor.defaultProps = {
	language: undefined,
	readOnly: false,
	height: '40vh',
};

export default Editor;
