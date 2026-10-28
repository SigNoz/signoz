import { useMemo } from 'react';
import { EditorProps } from '@monaco-editor/react';
import MonacoEditor from 'lib/monaco/MonacoEditor';

function Editor({
	value,
	language,
	onChange,
	readOnly,
	height,
	options,
}: MEditorProps): JSX.Element {
	const onChangeHandler = (newValue?: string): void => {
		if (readOnly) {
			return;
		}

		if (typeof newValue === 'string' && onChange) {
			onChange(newValue);
		}
	};

	const editorOptions = useMemo(
		() => ({ fontSize: 16, automaticLayout: true, readOnly, ...options }),
		[options, readOnly],
	);

	return (
		<MonacoEditor
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
