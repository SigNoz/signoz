import { Monaco } from '@monaco-editor/react';

type EditorOptions = Parameters<Monaco['editor']['create']>[1];

const BASE_EDITOR_OPTIONS: EditorOptions = {
	automaticLayout: true,
	wordWrap: 'on',
	minimap: { enabled: false },
	fontFamily: 'Geist Mono',
	fontSize: 13,
	lineHeight: 20,
	scrollBeyondLastLine: false,
	folding: true,
	tabSize: 2,
};

export const READONLY_EDITOR_OPTIONS: EditorOptions = {
	...BASE_EDITOR_OPTIONS,
	readOnly: true,
	domReadOnly: true,
};

export const EDITABLE_EDITOR_OPTIONS: EditorOptions = {
	...BASE_EDITOR_OPTIONS,
	fixedOverflowWidgets: true,
};
