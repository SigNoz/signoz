import { type MouseEvent, useCallback, useMemo, useRef } from 'react';
import {
	autocompletion,
	closeCompletion,
	completionKeymap,
	startCompletion,
} from '@codemirror/autocomplete';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { Color } from '@signozhq/design-tokens';
import { ChevronUp, Command, CornerDownLeft, Search } from '@signozhq/icons';
import CodeMirror, {
	EditorView,
	keymap,
	Prec,
	type ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

import type { DslGrammar, SuggestionSource } from '../dsl/types';
import { dslCompletionSource } from './dslCompletions';
import { dslHighlight } from './dslHighlight';
import { BASIC_SETUP, EMPTY_SOURCE, editorTheme } from './editorConfig';

import styles from './SearchBar.module.scss';

interface Props {
	value: string;
	grammar: DslGrammar;
	// Ids: `${testIdPrefix}`, `-submit`, `-dirty`.
	testIdPrefix: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	placeholder?: string;
	source?: SuggestionSource;
	// The draft differs from the last-run query — shows a "run to apply" hint.
	dirty?: boolean;
	/** Filtering needs `list`: the draft edits a query that cannot be run. */
	disabled?: boolean;
	onSubmitted?: (hasQuery: boolean) => void;
}

function SearchBar({
	value,
	grammar,
	testIdPrefix,
	onChange,
	onSubmit,
	placeholder = "Filter with DSL (e.g. name CONTAINS 'foo')",
	source = EMPTY_SOURCE,
	dirty = false,
	disabled = false,
	onSubmitted,
}: Props): JSX.Element {
	const isMac = getUserOperatingSystem() === UserOperatingSystem.MACOS;
	const editorRef = useRef<ReactCodeMirrorRef>(null);

	// Refs so the (memoised, stable) extensions always see the latest values.
	const sourceRef = useRef(source);
	sourceRef.current = source;
	const grammarRef = useRef(grammar);
	grammarRef.current = grammar;
	const handleSubmit = useCallback((): void => {
		onSubmitted?.(!!value.trim());
		onSubmit();
	}, [onSubmit, onSubmitted, value]);
	const onSubmitRef = useRef(handleSubmit);
	onSubmitRef.current = handleSubmit;

	const extensions = useMemo(
		() => [
			dslHighlight,
			editorTheme,
			// Wrap a long query onto the next line instead of scrolling horizontally.
			EditorView.lineWrapping,
			// Read-only is not enough: these open the list on click and accepting an
			// option writes to the document, so a disabled box must not carry them.
			...(disabled
				? []
				: [
						autocompletion({
							override: [
								dslCompletionSource(
									() => sourceRef.current,
									() => grammarRef.current,
								),
							],
							closeOnBlur: true,
							activateOnTyping: true,
							maxRenderedOptions: 100,
							icons: false,
						}),
						// Open the suggestions on focus/click (not only while typing), so a
						// click into the box immediately shows the key list.
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
					]),
			Prec.highest(
				keymap.of([
					...(disabled ? [] : completionKeymap),
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
		[disabled],
	);

	return (
		<div className={styles.wrapper}>
			<div className={cx(styles.field, { [styles.disabled]: disabled })}>
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
					editable={!disabled}
					data-testid={testIdPrefix}
					onChange={(next): void => onChange(next.replace(/\n/g, ' '))}
				/>
				<span
					className={styles.submit}
					onMouseDown={(e: MouseEvent<HTMLSpanElement>): void => e.preventDefault()}
				>
					<Button
						disabledTooltip={undefined}
						variant="outlined"
						color="secondary"
						size="sm"
						aria-label="Run search"
						disabled={disabled}
						testId={`${testIdPrefix}-submit`}
						onClick={handleSubmit}
						prefix={
							dirty ? (
								<span
									className={styles.dirtyDot}
									data-testid={`${testIdPrefix}-dirty`}
								/>
							) : undefined
						}
						suffix={
							<span className={styles.cmdHint}>
								{isMac ? <Command size={12} /> : <ChevronUp size={12} />}
								<CornerDownLeft size={12} />
							</span>
						}
					>
						Run query
					</Button>
				</span>
			</div>
		</div>
	);
}

export default SearchBar;
