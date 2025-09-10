/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-identical-functions */

import '../QuerySearch/QuerySearch.styles.scss';

import { CheckCircleFilled } from '@ant-design/icons';
import {
	autocompletion,
	closeCompletion,
	CompletionContext,
	completionKeymap,
	CompletionResult,
	startCompletion,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { Color } from '@signozhq/design-tokens';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, { EditorView, keymap, Prec } from '@uiw/react-codemirror';
import { Button, Popover } from 'antd';
import cx from 'classnames';
import {
	TRACE_OPERATOR_OPERATORS,
	TRACE_OPERATOR_OPERATORS_LABELS,
	TRACE_OPERATOR_OPERATORS_WITH_PRIORITY,
} from 'constants/antlrQueryConstants';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IDetailedError, IValidationResult } from 'types/antlrQueryTypes';
import { IBuilderTraceOperator } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { validateTraceOperatorQuery } from 'utils/queryValidationUtils';

import { getTraceOperatorContextAtCursor } from './utils/traceOperatorContextUtils';
import { getInvolvedQueriesInTraceOperator } from './utils/utils';

// Custom extension to stop events
const stopEventsExtension = EditorView.domEventHandlers({
	keydown: (event) => {
		// Stop all keyboard events from propagating to global shortcuts
		event.stopPropagation();
		event.stopImmediatePropagation();
		return false; // Important for CM to know you handled it
	},
	input: (event) => {
		event.stopPropagation();
		return false;
	},
	focus: (event) => {
		// Ensure focus events don't interfere with global shortcuts
		event.stopPropagation();
		return false;
	},
	blur: (event) => {
		// Ensure blur events don't interfere with global shortcuts
		event.stopPropagation();
		return false;
	},
});

interface TraceOperatorEditorProps {
	value: string;
	traceOperator: IBuilderTraceOperator;
	onChange: (value: string) => void;
	placeholder?: string;
	onRun?: (query: string) => void;
}

function TraceOperatorEditor({
	value,
	onChange,
	traceOperator,
	placeholder = 'Enter your trace operator query',
	onRun,
}: TraceOperatorEditorProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [isFocused, setIsFocused] = useState(false);
	const [cursorPos, setCursorPos] = useState({ line: 0, ch: 0 });
	const editorRef = useRef<EditorView | null>(null);
	const [validation, setValidation] = useState<IValidationResult>({
		isValid: false,
		message: '',
		errors: [],
	});
	// Track if the query was changed externally (from props) vs internally (user input)
	const [isExternalQueryChange, setIsExternalQueryChange] = useState(false);
	const [lastExternalValue, setLastExternalValue] = useState<string>('');
	const { currentQuery, handleRunQuery } = useQueryBuilder();

	const queryOptions = useMemo(
		() =>
			currentQuery.builder.queryData
				.filter((query) => query.dataSource === DataSource.TRACES) // Only show trace queries
				.map((query) => ({
					label: query.queryName,
					type: 'atom',
					apply: query.queryName,
				})),
		[currentQuery.builder.queryData],
	);

	const toggleSuggestions = useCallback(
		(timeout?: number) => {
			const timeoutId = setTimeout(() => {
				if (!editorRef.current) return;
				if (isFocused) {
					startCompletion(editorRef.current);
				} else {
					closeCompletion(editorRef.current);
				}
			}, timeout);

			return (): void => clearTimeout(timeoutId);
		},
		[isFocused],
	);

	const handleQueryValidation = (newQuery: string): void => {
		try {
			const validationResponse = validateTraceOperatorQuery(newQuery);
			setValidation(validationResponse);
		} catch (error) {
			setValidation({
				isValid: false,
				message: 'Failed to process trace operator',
				errors: [error as IDetailedError],
			});
		}
	};

	// Detect external value changes and mark for validation
	useEffect(() => {
		const newValue = value || '';
		if (newValue !== lastExternalValue) {
			setIsExternalQueryChange(true);
			setLastExternalValue(newValue);
		}
	}, [value, lastExternalValue]);

	// Validate when the value changes externally (including on mount)
	useEffect(() => {
		if (isExternalQueryChange && value) {
			handleQueryValidation(value);
			setIsExternalQueryChange(false);
		}
	}, [isExternalQueryChange, value]);

	// Enhanced autosuggestion function with context awareness
	function autoSuggestions(context: CompletionContext): CompletionResult | null {
		// This matches words before the cursor position
		// eslint-disable-next-line no-useless-escape
		const word = context.matchBefore(/[a-zA-Z0-9_.:/?&=#%\-\[\]]*/);
		if (word?.from === word?.to && !context.explicit) return null;

		// Get the trace operator context at the cursor position
		const queryContext = getTraceOperatorContextAtCursor(value, cursorPos.ch);

		// Define autocomplete options based on the context
		let options: {
			label: string;
			type: string;
			info?: string;
			apply:
				| string
				| ((view: EditorView, completion: any, from: number, to: number) => void);
			detail?: string;
			boost?: number;
		}[] = [];

		// Helper function to add space after selection
		const addSpaceAfterSelection = (
			view: EditorView,
			completion: any,
			from: number,
			to: number,
			shouldAddSpace = true,
		): void => {
			view.dispatch({
				changes: {
					from,
					to,
					insert: shouldAddSpace ? `${completion.apply} ` : `${completion.apply}`,
				},
				selection: {
					anchor:
						from +
						(shouldAddSpace ? completion.apply.length + 1 : completion.apply.length),
				},
			});
			// Do not reopen here; onUpdate will handle reopening via toggleSuggestions
		};

		// Helper function to add space after selection to options
		const addSpaceToOptions = (opts: typeof options): typeof options =>
			opts.map((option) => {
				const originalApply = option.apply || option.label;
				return {
					...option,
					apply: (
						view: EditorView,
						completion: any,
						from: number,
						to: number,
					): void => {
						addSpaceAfterSelection(view, { apply: originalApply }, from, to);
					},
				};
			});

		if (queryContext.isInAtom) {
			// Suggest atoms (identifiers) for trace operators

			const involvedQueries = getInvolvedQueriesInTraceOperator([traceOperator]);

			options = queryOptions.map((option) => ({
				...option,
				boost: !involvedQueries.includes(option.apply as string) ? 100 : -99,
			}));

			// Filter options based on what user is typing
			const searchText = word?.text.toLowerCase().trim() ?? '';
			options = options.filter((option) =>
				option.label.toLowerCase().includes(searchText),
			);

			// Add space after selection for atoms
			const optionsWithSpace = addSpaceToOptions(options);

			return {
				from: word?.from ?? 0,
				to: word?.to ?? cursorPos.ch,
				options: optionsWithSpace,
			};
		}

		if (queryContext.isInOperator) {
			// Suggest operators for trace operators
			const operators = Object.values(TRACE_OPERATOR_OPERATORS);
			options = operators.map((operator) => ({
				label: TRACE_OPERATOR_OPERATORS_LABELS[operator]
					? `${operator} (${TRACE_OPERATOR_OPERATORS_LABELS[operator]})`
					: operator,
				type: 'operator',
				apply: operator,
				boost: TRACE_OPERATOR_OPERATORS_WITH_PRIORITY[operator] * -10,
			}));

			// Add space after selection for operators
			const optionsWithSpace = addSpaceToOptions(options);

			return {
				from: word?.from ?? 0,
				to: word?.to ?? cursorPos.ch,
				options: optionsWithSpace,
			};
		}

		if (queryContext.isInParenthesis) {
			// Different suggestions based on the context within parenthesis
			const curChar = value.charAt(cursorPos.ch - 1) || '';

			if (curChar === '(') {
				// Right after opening parenthesis, suggest atoms or nested expressions
				options = [
					{ label: '(', type: 'parenthesis', apply: '(' },
					...queryOptions,
				];

				// Add space after selection for opening parenthesis context
				const optionsWithSpace = addSpaceToOptions(options);

				return {
					from: word?.from ?? 0,
					options: optionsWithSpace,
				};
			}

			if (curChar === ')') {
				// After closing parenthesis, suggest operators
				const operators = Object.values(TRACE_OPERATOR_OPERATORS);
				options = operators.map((operator) => ({
					label: TRACE_OPERATOR_OPERATORS_LABELS[operator]
						? `${operator} (${TRACE_OPERATOR_OPERATORS_LABELS[operator]})`
						: operator,
					type: 'operator',
					apply: operator,
					boost: TRACE_OPERATOR_OPERATORS_WITH_PRIORITY[operator] * -10,
				}));

				// Add space after selection for closing parenthesis context
				const optionsWithSpace = addSpaceToOptions(options);

				return {
					from: word?.from ?? 0,
					options: optionsWithSpace,
				};
			}
		}

		// Default: suggest atoms if no specific context
		options = [
			...queryOptions,
			{
				label: '(',
				type: 'parenthesis',
				apply: '(',
			},
		];

		// Filter options based on what user is typing
		const searchText = word?.text.toLowerCase().trim() ?? '';
		options = options.filter((option) =>
			option.label.toLowerCase().includes(searchText),
		);

		// Add space after selection
		const optionsWithSpace = addSpaceToOptions(options);

		return {
			from: word?.from ?? 0,
			to: word?.to ?? context.pos,
			options: optionsWithSpace,
		};
	}

	const handleUpdate = useCallback(
		(viewUpdate: { view: EditorView }): void => {
			if (!editorRef.current) {
				editorRef.current = viewUpdate.view;
			}

			const selection = viewUpdate.view.state.selection.main;
			const pos = selection.head;

			const lineInfo = viewUpdate.view.state.doc.lineAt(pos);
			const newPos = {
				line: lineInfo.number,
				ch: pos - lineInfo.from,
			};

			if (newPos.line !== cursorPos.line || newPos.ch !== cursorPos.ch) {
				setCursorPos(newPos);
				// Trigger suggestions on context update
				toggleSuggestions(10);
			}
		},
		[cursorPos, toggleSuggestions],
	);

	const handleChange = (newValue: string): void => {
		// Mark as internal change to avoid triggering external validation
		setIsExternalQueryChange(false);
		setLastExternalValue(newValue);
		onChange(newValue);
	};

	const handleBlur = (): void => {
		handleQueryValidation(value);
		setIsFocused(false);
	};

	// Effect to handle focus state and trigger suggestions on focus
	useEffect(() => {
		const clearTimeout = toggleSuggestions(10);
		return (): void => clearTimeout();
	}, [isFocused, toggleSuggestions]);

	return (
		<div className="code-mirror-where-clause">
			<div className="query-where-clause-editor-container">
				<CodeMirror
					value={value}
					theme={isDarkMode ? copilot : githubLight}
					onChange={handleChange}
					onUpdate={handleUpdate}
					className={cx('query-where-clause-editor', {
						isValid: validation.isValid === true,
						hasErrors: validation.errors.length > 0,
					})}
					extensions={[
						autocompletion({
							override: [autoSuggestions],
							defaultKeymap: true,
							closeOnBlur: true,
							activateOnTyping: true,
							maxRenderedOptions: 50,
						}),
						javascript({ jsx: false, typescript: false }),
						EditorView.lineWrapping,
						stopEventsExtension,
						Prec.highest(
							keymap.of([
								...completionKeymap,
								{
									key: 'Escape',
									run: closeCompletion,
								},
								{
									key: 'Enter',
									preventDefault: true,
									// Prevent default behavior of Enter to add new line
									// and instead run a custom action
									run: (): boolean => true,
								},
								{
									key: 'Mod-Enter',
									preventDefault: true,
									run: (): boolean => {
										if (onRun && typeof onRun === 'function') {
											onRun(value);
										} else {
											handleRunQuery();
										}
										return true;
									},
								},
								{
									key: 'Shift-Enter',
									preventDefault: true,
									// Prevent default behavior of Shift-Enter to add new line
									run: (): boolean => true,
								},
							]),
						),
					]}
					placeholder={placeholder}
					basicSetup={{
						lineNumbers: false,
					}}
					onFocus={(): void => {
						setIsFocused(true);
					}}
					onBlur={handleBlur}
				/>
				{value && validation.isValid === false && !isFocused && (
					<div
						className={cx('query-status-container', {
							hasErrors: validation.errors.length > 0,
						})}
					>
						<Popover
							placement="bottomRight"
							showArrow={false}
							content={
								<div className="query-status-content">
									<div className="query-status-content-header">
										<div className="query-validation">
											<div className="query-validation-errors">
												{validation.errors.map((error) => (
													<div key={error.message} className="query-validation-error">
														<div className="query-validation-error">
															{error.line}:{error.column} - {error.message}
														</div>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							}
							overlayClassName="query-status-popover"
						>
							{validation.isValid ? (
								<Button
									type="text"
									icon={<CheckCircleFilled />}
									className="periscope-btn ghost"
								/>
							) : (
								<Button
									type="text"
									icon={<TriangleAlert size={14} color={Color.BG_CHERRY_500} />}
									className="periscope-btn ghost"
								/>
							)}
						</Popover>
					</div>
				)}
			</div>
		</div>
	);
}

TraceOperatorEditor.defaultProps = {
	onRun: undefined,
	placeholder: 'Enter your trace operator query',
};

export default TraceOperatorEditor;
