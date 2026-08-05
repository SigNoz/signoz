import { type MouseEvent, useCallback, useMemo, useRef } from 'react';
import {
	autocompletion,
	closeCompletion,
	completionKeymap,
	startCompletion,
} from '@codemirror/autocomplete';
import { Button } from '@signozhq/ui/button';
import { Color } from '@signozhq/design-tokens';
import { ChevronUp, Command, CornerDownLeft, Search } from '@signozhq/icons';
import CodeMirror, {
	EditorView,
	keymap,
	Prec,
	type ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import logEvent from 'api/common/logEvent';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

import type { SuggestionSource } from '../../utils/dslSuggestions';
import { dslCompletionSource } from './dslCompletions';
import { dslHighlight } from './dslHighlight';

import styles from './SearchBar.module.scss';

interface Props {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	placeholder?: string;
	source?: SuggestionSource;
	// The draft differs from the last-run query — shows a "run to apply" hint.
	dirty?: boolean;
}

const EMPTY_SOURCE: SuggestionSource = {
	tagKeys: [],
	tagValuesByKey: {},
	creatorEmails: [],
};

// Token colours come from `.cm-dsl-*` classes (SearchBar.module.scss); this only
// handles layout — transparent background, monospace, single line.
const editorTheme = EditorView.theme({
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

const BASIC_SETUP = {
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

function SearchBar({
	value,
	onChange,
	onSubmit,
	placeholder = "Filter with DSL (e.g. name CONTAINS 'foo')",
	source = EMPTY_SOURCE,
	dirty = false,
}: Props): JSX.Element {
	const isMac = getUserOperatingSystem() === UserOperatingSystem.MACOS;
	const editorRef = useRef<ReactCodeMirrorRef>(null);

	// Refs so the (memoised, stable) extensions always see the latest values.
	const sourceRef = useRef(source);
	sourceRef.current = source;
	const handleSubmit = useCallback((): void => {
		void logEvent(DashboardListEvents.SearchExecuted, {
			hasQuery: !!value.trim(),
		});
		onSubmit();
	}, [onSubmit, value]);
	const onSubmitRef = useRef(handleSubmit);
	onSubmitRef.current = handleSubmit;

	const extensions = useMemo(
		() => [
			dslHighlight,
			editorTheme,
			// Wrap a long query onto the next line instead of scrolling horizontally.
			EditorView.lineWrapping,
			autocompletion({
				override: [dslCompletionSource(() => sourceRef.current)],
				closeOnBlur: true,
				activateOnTyping: true,
				maxRenderedOptions: 100,
				icons: false,
			}),
			// Open the suggestions on focus/click (not only while typing), so a click
			// into the box immediately shows the key list.
			EditorView.domEventHandlers({
				focus: (_event, view): boolean => {
					startCompletion(view);
					return false;
				},
				click: (_event, view): boolean => {
					startCompletion(view);
					return false;
				},
			}),
			Prec.highest(
				keymap.of([
					...completionKeymap,
					{ key: 'Escape', run: closeCompletion },
					// Enter accepts an open suggestion (via completionKeymap above); with
					// none open it is a no-op — it never runs the query or inserts a newline.
					{ key: 'Enter', preventDefault: true, run: (): boolean => true },
					{ key: 'Shift-Enter', preventDefault: true, run: (): boolean => true },
					{
						key: 'Mod-Enter',
						preventDefault: true,
						run: (): boolean => {
							onSubmitRef.current();
							return true;
						},
					},
				]),
			),
		],
		[],
	);

	return (
		<div className={styles.wrapper}>
			<div className={styles.field}>
				<Search
					size={12}
					color={Color.BG_VANILLA_400}
					className={styles.leadIcon}
				/>
				<CodeMirror
					ref={editorRef}
					className={styles.editor}
					value={value}
					placeholder={placeholder}
					extensions={extensions}
					basicSetup={BASIC_SETUP}
					indentWithTab={false}
					data-testid="dashboards-list-search"
					onChange={(next): void => onChange(next.replace(/\n/g, ' '))}
				/>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					className={styles.submit}
					aria-label="Run search"
					testId="dashboards-list-search-submit"
					onMouseDown={(e: MouseEvent<HTMLButtonElement>): void => {
						e.preventDefault();
					}}
					onClick={handleSubmit}
				>
					{dirty && (
						<span
							className={styles.dirtyDot}
							data-testid="dashboards-list-search-dirty"
						/>
					)}
					Run query
					<span className={styles.cmdHint}>
						{isMac ? (
							<Command size={12} color={Color.BG_VANILLA_400} />
						) : (
							<ChevronUp size={12} color={Color.BG_VANILLA_400} />
						)}
						<CornerDownLeft size={12} color={Color.BG_VANILLA_400} />
					</span>
				</Button>
			</div>
		</div>
	);
}

export default SearchBar;
