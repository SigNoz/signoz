import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, {
	type BasicSetupOptions,
	EditorView,
	type ViewUpdate,
} from '@uiw/react-codemirror';
import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { formatVariableToken, MARKDOWN_MAX_LENGTH } from './constants';
import EditorStatusBar from './EditorStatusBar';
import EditorToolbar from './EditorToolbar';
import { applyTransform, replaceDocument } from './editorDocument';
import { insertText, MARKDOWN_COMMANDS } from './markdownCommands';
import { markdownHighlight } from './markdownHighlight';
import type {
	CursorPosition,
	EditorCommand,
	EditorTransform,
	EditorVariable,
} from './types';

import styles from './MarkdownEditor.module.scss';

/** What the status bar reports. */
type DocumentStatus = CursorPosition & { length: number };

// No language grammar is loaded, so bracket/indent/completion behaviour would only
// get in the way of prose. `indentWithTab` stays off so Tab keeps moving focus.
const BASIC_SETUP: BasicSetupOptions = {
	lineNumbers: true,
	highlightActiveLine: true,
	highlightActiveLineGutter: true,
	foldGutter: false,
	autocompletion: false,
	bracketMatching: false,
	closeBrackets: false,
	indentOnInput: false,
	syntaxHighlighting: false,
	highlightSelectionMatches: false,
	rectangularSelection: false,
	crosshairCursor: false,
	searchKeymap: false,
	foldKeymap: false,
	lintKeymap: false,
	completionKeymap: false,
	closeBracketsKeymap: false,
};

const EMPTY_VARIABLES: EditorVariable[] = [];

export interface MarkdownEditorProps {
	/** Seeds the document; replaced only from outside. See the sync effect. */
	value: string;
	onChange: (value: string) => void;
	/** Offered by the "Insert variable" menu; the button disables when empty. */
	variables?: EditorVariable[];
	/** What the character counter reports against. */
	maxLength?: number;
	placeholder?: string;
	readOnly?: boolean;
	/** Shown on the toolbar chip. */
	formatLabel?: string;
	/** Rendered before the "Insert variable" menu. */
	toolbarExtra?: ReactNode;
	/** Right-hand status-bar note, e.g. "Preview updates as you type". */
	statusHint?: ReactNode;
	autoFocus?: boolean;
	className?: string;
	testId?: string;
}

/**
 * Source editor for Markdown bodies. Source-only: it neither parses nor renders
 * the body, so the preview surface and its sanitisation stay the caller's concern.
 */
function MarkdownEditor({
	value,
	onChange,
	variables = EMPTY_VARIABLES,
	maxLength = MARKDOWN_MAX_LENGTH,
	placeholder = 'Write Markdown…',
	readOnly = false,
	formatLabel = 'Markdown',
	toolbarExtra,
	statusHint,
	autoFocus = false,
	className,
	testId = 'markdown-editor',
}: MarkdownEditorProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const viewRef = useRef<EditorView | null>(null);
	// Set while a programmatic replacement is in flight, so the caller isn't told
	// about a change it asked for. `dispatch` runs listeners synchronously, so the
	// window is exactly one call.
	const isSyncingRef = useRef(false);
	const previousValueRef = useRef(value);
	const hasSeededRef = useRef(false);
	const [isEditorReady, setIsEditorReady] = useState(false);
	const [status, setStatus] = useState<DocumentStatus>(() => ({
		line: 1,
		column: 1,
		length: value.length,
	}));

	const syncDocument = useCallback((view: EditorView, next: string): void => {
		isSyncingRef.current = true;
		replaceDocument(view, next);
		isSyncingRef.current = false;
	}, []);

	const onCreateEditor = useCallback((view: EditorView): void => {
		viewRef.current = view;
		setIsEditorReady(true);
	}, []);

	/**
	 * Seeds the document, then applies external replacements — nothing else. Keeping
	 * keystrokes out of this round-trip is what stops a stale `value` from replacing
	 * the document and resetting the caret when typing outpaces React.
	 *
	 * The seed can't go in `onCreateEditor`: the wrapper defaults its own `value` to
	 * `''` and reconciles against it once the view exists, wiping anything written
	 * before that. `isEditorReady` puts this effect after that pass, since a parent's
	 * effects flush after its children's.
	 *
	 * Focus marks ownership: a replacement arriving mid-typing is dropped rather than
	 * applied over the author.
	 */
	useEffect(() => {
		const view = viewRef.current;
		if (!view) {
			return;
		}

		const previous = previousValueRef.current;
		previousValueRef.current = value;
		const isSeeding = !hasSeededRef.current;
		hasSeededRef.current = true;

		if (!isSeeding && (value === previous || view.hasFocus)) {
			return;
		}
		if (view.state.doc.toString() !== value) {
			syncDocument(view, value);
		}
	}, [value, isEditorReady, syncDocument]);

	const handleChange = useCallback(
		(next: string): void => {
			if (!isSyncingRef.current) {
				onChange(next);
			}
		},
		[onChange],
	);

	const runTransform = useCallback((transform: EditorTransform): void => {
		const view = viewRef.current;
		if (view) {
			applyTransform(view, transform);
		}
	}, []);

	const onRunCommand = useCallback(
		(command: EditorCommand): void => runTransform(command.run),
		[runTransform],
	);

	const onInsertVariable = useCallback(
		(name: string): void =>
			runTransform((snapshot) => insertText(snapshot, formatVariableToken(name))),
		[runTransform],
	);

	const extensions = useMemo(
		() => [markdownHighlight(), EditorView.lineWrapping],
		[],
	);

	// From the document, not `value`: the caller may debounce or drop a change, and
	// the counter has to match what the author sees.
	const onUpdate = useCallback((update: ViewUpdate): void => {
		if (!update.selectionSet && !update.docChanged) {
			return;
		}
		const { head } = update.state.selection.main;
		const line = update.state.doc.lineAt(head);
		setStatus({
			line: line.number,
			column: head - line.from + 1,
			length: update.state.doc.length,
		});
	}, []);

	return (
		<div className={cx(styles.container, className)} data-testid={testId}>
			<EditorToolbar
				formatLabel={formatLabel}
				commands={MARKDOWN_COMMANDS}
				onRunCommand={onRunCommand}
				variables={variables}
				onInsertVariable={onInsertVariable}
				disabled={readOnly}
				extra={toolbarExtra}
			/>
			<div className={styles.editorArea}>
				<CodeMirror
					className={styles.codeMirror}
					// No `value`: passing it re-enables the wrapper's own reconciliation,
					// and with it the caret reset.
					onCreateEditor={onCreateEditor}
					onChange={handleChange}
					onUpdate={onUpdate}
					theme={isDarkMode ? copilot : githubLight}
					basicSetup={BASIC_SETUP}
					placeholder={placeholder}
					editable={!readOnly}
					readOnly={readOnly}
					indentWithTab={false}
					autoFocus={autoFocus}
					extensions={extensions}
					height="100%"
				/>
			</div>
			<EditorStatusBar
				cursor={status}
				length={status.length}
				maxLength={maxLength}
				hint={statusHint}
			/>
		</div>
	);
}

export default MarkdownEditor;
