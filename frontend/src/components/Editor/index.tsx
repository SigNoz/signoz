import * as monaco from 'monaco-editor';
import React, { useEffect, useRef } from 'react';

import { Container } from './styles';

const Editor = ({ value }: EditorProps) => {
	const divEl = useRef<HTMLDivElement>(null);
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

	useEffect(() => {
		let editor = editorRef.current;

		if (divEl.current) {
			editor = monaco.editor.create(divEl.current, {
				value: value.current || '',
				useShadowDOM: true,
				theme: 'vs-dark',
				automaticLayout: true,
				fontSize: 16,
				minimap: {
					enabled: false,
				},
				language: 'yaml',
			});
		}

		editor?.getModel()?.onDidChangeContent(() => {
			value.current = editor?.getValue() || '';
		});

		return () => {
			if (editor) {
				editor.dispose();
			}
		};
	}, [value]);

	return <Container ref={divEl} />;
};

interface EditorProps {
	value: React.MutableRefObject<string>;
}

export default Editor;
