import MEditor, { EditorProps } from '@monaco-editor/react';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useMemo } from 'react';

function Editor({
	value,
	language,
	onChange,
	readOnly,
	height,
	options,
}: MEditorProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const onChangeHandler = (newValue?: string): void => {
		if (readOnly) return;

		if (typeof newValue === 'string' && onChange) onChange(newValue);
	};

	const editorOptions = useMemo(
		() => ({ fontSize: 16, automaticLayout: true, readOnly, ...options }),
		[options, readOnly],
	);

	return (
		<MEditor
			theme={isDarkMode ? 'vs-dark' : 'vs-light'}
			language={language}
			value={value}
			options={editorOptions}
			height={height}
			onChange={onChangeHandler}
			data-testid="monaco-editor"
		/>
	);
}

interface MEditorProps {
	value: string;
	language?: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	height?: string;
	options?: EditorProps['options'];
}

Editor.defaultProps = {
	language: 'yaml',
	readOnly: false,
	height: '40vh',
	options: {},
	onChange: (): void => {},
};

export default Editor;
