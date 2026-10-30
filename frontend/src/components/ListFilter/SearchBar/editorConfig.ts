import { EditorView } from '@uiw/react-codemirror';

import type { SuggestionSource } from '../dsl/types';

export const EMPTY_SOURCE: SuggestionSource = {
	dynamicKeys: [],
	valuesByKey: {},
	creatorEmails: [],
};

// Token colours come from `.cm-dsl-*` classes (SearchBar.module.scss); this only
// handles layout — transparent background, monospace, single line.
export const editorTheme = EditorView.theme({
	'&': { fontSize: '13px', backgroundColor: 'transparent' },
	'&.cm-focused': { outline: 'none' },
	'.cm-content': {
		// Leave room for the overlaid lead icon (left) and Run button (right).
		padding: '8px 120px 8px 30px',
		fontFamily: "'Space Mono', monospace",
		color: 'var(--l1-foreground)',
		caretColor: 'var(--l1-foreground)',
	},
	'.cm-line': { padding: '0' },
	'.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.5' },
	'.cm-placeholder': { color: 'var(--l3-foreground)' },
});

export const BASIC_SETUP = {
	lineNumbers: false,
	foldGutter: false,
	highlightActiveLine: false,
	highlightActiveLineGutter: false,
	highlightSelectionMatches: false,
	bracketMatching: false,
	closeBrackets: false,
	autocompletion: false,
	// Use the browser's native caret so it blinks (a CM-drawn cursor needs extra
	// styling and doesn't blink by default).
	drawSelection: false,
} as const;
