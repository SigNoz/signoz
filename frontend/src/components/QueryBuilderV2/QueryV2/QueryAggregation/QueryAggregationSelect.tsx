/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-cond-assign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
/* eslint-disable react/no-this-in-sfc */
/* eslint-disable sonarjs/cognitive-complexity */
import './QueryAggregation.styles.scss';

import {
	autocompletion,
	closeCompletion,
	Completion,
	CompletionContext,
	completionKeymap,
	CompletionResult,
	startCompletion,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { RangeSetBuilder } from '@codemirror/state';
import { copilot } from '@uiw/codemirror-theme-copilot';
import CodeMirror, {
	Decoration,
	EditorView,
	keymap,
	ViewPlugin,
	ViewUpdate,
} from '@uiw/react-codemirror';
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { tracesAggregateOperatorOptions } from 'constants/queryBuilderOperators';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { TracesAggregatorOperator } from 'types/common/queryBuilder';

import { useQueryBuilderV2Context } from '../../QueryBuilderV2Context';

const chipDecoration = Decoration.mark({
	class: 'chip-decorator',
});

const operatorArgMeta: Record<
	string,
	{ acceptsArgs: boolean; multiple: boolean }
> = {
	[TracesAggregatorOperator.NOOP]: { acceptsArgs: false, multiple: false },
	[TracesAggregatorOperator.COUNT]: { acceptsArgs: false, multiple: false },
	[TracesAggregatorOperator.COUNT_DISTINCT]: {
		acceptsArgs: true,
		multiple: true,
	},
	[TracesAggregatorOperator.SUM]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.AVG]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.MAX]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.MIN]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P05]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P10]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P20]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P25]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P50]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P75]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P90]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P95]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.P99]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.RATE]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.RATE_SUM]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.RATE_AVG]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.RATE_MIN]: { acceptsArgs: true, multiple: false },
	[TracesAggregatorOperator.RATE_MAX]: { acceptsArgs: true, multiple: false },
};

function getFunctionContextAtCursor(
	text: string,
	cursorPos: number,
): string | null {
	// Find the nearest function name to the left of the nearest unmatched '('
	let openParenIndex = -1;
	let funcName: string | null = null;
	let parenStack = 0;
	for (let i = cursorPos - 1; i >= 0; i--) {
		if (text[i] === ')') parenStack++;
		else if (text[i] === '(') {
			if (parenStack === 0) {
				openParenIndex = i;
				const before = text.slice(0, i);
				const match = before.match(/(\w+)\s*$/);
				if (match) funcName = match[1].toLowerCase();
				break;
			}
			parenStack--;
		}
	}
	if (openParenIndex === -1 || !funcName) return null;
	// Scan forwards to find the matching closing parenthesis
	let closeParenIndex = -1;
	let depth = 1;
	for (let j = openParenIndex + 1; j < text.length; j++) {
		if (text[j] === '(') depth++;
		else if (text[j] === ')') depth--;
		if (depth === 0) {
			closeParenIndex = j;
			break;
		}
	}
	if (
		cursorPos > openParenIndex &&
		(closeParenIndex === -1 || cursorPos <= closeParenIndex)
	) {
		return funcName;
	}
	return null;
}

// Custom extension to stop events from propagating to global shortcuts
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

// eslint-disable-next-line react/no-this-in-sfc
function QueryAggregationSelect({
	onChange,
	queryData,
}: {
	onChange?: (value: string) => void;
	queryData: IBuilderQuery;
}): JSX.Element {
	const { setAggregationOptions } = useQueryBuilderV2Context();

	const [input, setInput] = useState(
		queryData?.aggregations?.map((i: any) => i.expression).join(' ') || '',
	);
	const [cursorPos, setCursorPos] = useState(0);
	const [functionArgPairs, setFunctionArgPairs] = useState<
		{ func: string; arg: string }[]
	>([]);
	const editorRef = useRef<EditorView | null>(null);
	const [isFocused, setIsFocused] = useState(false);

	// Helper function to safely start completion
	const safeStartCompletion = useCallback((): void => {
		requestAnimationFrame(() => {
			if (editorRef.current) {
				startCompletion(editorRef.current);
			}
		});
	}, []);

	// Update cursor position on every editor update
	const handleUpdate = (update: { view: EditorView }): void => {
		const pos = update.view.state.selection.main.from;
		setCursorPos(pos);
	};

	// Effect to handle focus state and trigger suggestions
	useEffect(() => {
		if (isFocused) {
			safeStartCompletion();
		}
	}, [isFocused, safeStartCompletion]);

	// Extract all valid function-argument pairs from the input
	useEffect(() => {
		const pairs: { func: string; arg: string }[] = [];
		const regex = /([a-zA-Z_][\w]*)\s*\(([^)]*)\)/g;
		let match;
		while ((match = regex.exec(input)) !== null) {
			const func = match[1].toLowerCase();
			const args = match[2]
				.split(',')
				.map((arg) => arg.trim())
				.filter((arg) => arg.length > 0);

			if (args.length === 0) {
				// For functions with no arguments, add a pair with empty string as arg
				pairs.push({ func, arg: '' });
			} else {
				args.forEach((arg) => {
					pairs.push({ func, arg });
				});
			}
		}
		setFunctionArgPairs(pairs);
		setAggregationOptions(pairs);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [input]);

	// Find function context for fetching suggestions
	const functionContextForFetch = getFunctionContextAtCursor(input, cursorPos);

	const { data: aggregateAttributeData, isLoading: isLoadingFields } = useQuery(
		[
			QueryBuilderKeys.GET_AGGREGATE_ATTRIBUTE,
			functionContextForFetch,
			queryData.dataSource,
		],
		() =>
			getAggregateAttribute({
				searchText: '',
				aggregateOperator: functionContextForFetch as string,
				dataSource: queryData.dataSource,
			}),
		{
			enabled:
				!!functionContextForFetch &&
				!!operatorArgMeta[functionContextForFetch]?.acceptsArgs,
		},
	);

	// Get valid function names (lowercase)
	const validFunctions = useMemo(
		() => tracesAggregateOperatorOptions.map((op) => op.value.toLowerCase()),
		[],
	);

	// Memoized chipPlugin that highlights valid function calls like count(), max(arg), min(arg)
	const chipPlugin = useMemo(
		() =>
			ViewPlugin.fromClass(
				class {
					decorations: import('@codemirror/view').DecorationSet;

					constructor(view: EditorView) {
						this.decorations = this.buildDecorations(view);
					}

					update(update: ViewUpdate): void {
						if (update.docChanged || update.viewportChanged) {
							this.decorations = this.buildDecorations(update.view);
						}
					}

					buildDecorations(
						view: EditorView,
					): import('@codemirror/view').DecorationSet {
						const builder = new RangeSetBuilder<Decoration>();
						for (const { from, to } of view.visibleRanges) {
							const text = view.state.doc.sliceString(from, to);

							const regex = /\b([a-zA-Z_][\w]*)\s*\(([^)]*)\)/g;
							let match;

							while ((match = regex.exec(text)) !== null) {
								const func = match[1].toLowerCase();

								if (validFunctions.includes(func)) {
									const start = from + match.index;
									const end = start + match[0].length;
									builder.add(start, end, chipDecoration);
								}
							}
						}
						return builder.finish();
					}
				},
				{
					decorations: (v: any): import('@codemirror/view').DecorationSet =>
						v.decorations,
				},
			),
		[validFunctions],
	) as any;

	const operatorCompletions: Completion[] = tracesAggregateOperatorOptions.map(
		(op) => ({
			label: op.value,
			type: 'function',
			info: op.label,
			apply: (
				view: EditorView,
				completion: Completion,
				from: number,
				to: number,
			): void => {
				const acceptsArgs = operatorArgMeta[op.value]?.acceptsArgs;

				let insertText: string;
				let cursorPos: number;

				if (!acceptsArgs) {
					insertText = `${op.value}() `;
					cursorPos = from + insertText.length; // Use insertText.length instead of hardcoded values
				} else {
					insertText = `${op.value}(`;
					cursorPos = from + insertText.length; // Use insertText.length instead of hardcoded values
				}

				view.dispatch({
					changes: { from, to, insert: insertText },
					selection: { anchor: cursorPos },
				});

				// Trigger suggestions after a small delay
				setTimeout(() => {
					safeStartCompletion();
				}, 50);
			},
		}),
	);

	// Memoize field suggestions from API (no filtering here)
	const fieldSuggestions = useMemo(
		() =>
			aggregateAttributeData?.payload?.attributeKeys?.map(
				(attributeKey: BaseAutocompleteData) => ({
					label: attributeKey.key,
					type: 'variable',
					info: attributeKey.dataType,
					apply: (
						view: EditorView,
						completion: Completion,
						from: number,
						to: number,
					): void => {
						const text = view.state.sliceDoc(0, from);
						const funcName = getFunctionContextAtCursor(text, from);
						const multiple = funcName ? operatorArgMeta[funcName]?.multiple : false;

						// Insert the selected key followed by either a comma or closing parenthesis
						const insertText = multiple
							? `${completion.label},`
							: `${completion.label}) `;
						const cursorPos = from + insertText.length; // Use insertText.length instead of hardcoded values

						view.dispatch({
							changes: { from, to, insert: insertText },
							selection: { anchor: cursorPos },
						});

						// Trigger next suggestions after a small delay
						setTimeout(() => {
							safeStartCompletion();
						}, 50);
					},
				}),
			) || [],
		[aggregateAttributeData, safeStartCompletion],
	);

	const aggregatorAutocomplete = useMemo(
		() =>
			autocompletion({
				override: [
					(context: CompletionContext): CompletionResult | null => {
						const text = context.state.sliceDoc(0, context.state.doc.length);
						const cursorPos = context.pos;
						const funcName = getFunctionContextAtCursor(text, cursorPos);

						// Do not show suggestions if inside count()
						if (
							funcName === TracesAggregatorOperator.COUNT &&
							cursorPos > 0 &&
							text[cursorPos - 1] !== ')'
						) {
							return null;
						}

						// If inside a function that accepts args, show field suggestions
						if (funcName && operatorArgMeta[funcName]?.acceptsArgs) {
							if (isLoadingFields) {
								return {
									from: cursorPos,
									options: [
										{
											label: 'Loading suggestions...',
											type: 'text',
											apply: (): void => {},
										},
									],
								};
							}

							const doc = context.state.sliceDoc(0, cursorPos);
							const lastOpenParen = doc.lastIndexOf('(');
							const lastComma = doc.lastIndexOf(',', cursorPos - 1);
							const startOfArg =
								lastComma > lastOpenParen ? lastComma + 1 : lastOpenParen + 1;
							const inputText = doc.slice(startOfArg, cursorPos).trim();

							// Parse arguments already present in the function call (before the cursor)
							const usedArgs = new Set<string>();
							if (lastOpenParen !== -1) {
								const argsString = doc.slice(lastOpenParen + 1, cursorPos);
								argsString.split(',').forEach((arg) => {
									const trimmed = arg.trim();
									if (trimmed) usedArgs.add(trimmed);
								});
							}

							// Exclude arguments already paired with this function elsewhere in the input
							const globalUsedArgs = new Set(
								functionArgPairs
									.filter((pair) => pair.func === funcName)
									.map((pair) => pair.arg),
							);

							const availableSuggestions = fieldSuggestions.filter(
								(suggestion) =>
									!usedArgs.has(suggestion.label) &&
									!globalUsedArgs.has(suggestion.label),
							);

							const filteredSuggestions =
								inputText === ''
									? availableSuggestions
									: availableSuggestions.filter((suggestion) =>
											suggestion.label.toLowerCase().includes(inputText.toLowerCase()),
									  );

							return {
								from: startOfArg,
								options: filteredSuggestions,
							};
						}

						// Show operator suggestions if no function context or not accepting args
						if (!funcName || !operatorArgMeta[funcName]?.acceptsArgs) {
							// Check if 'count(' is present in the current input (case-insensitive)
							const hasCount = text.toLowerCase().includes('count(');
							const availableOperators = hasCount
								? operatorCompletions.filter((op) => op.label.toLowerCase() !== 'count')
								: operatorCompletions;

							// Get the word before cursor if any
							const word = context.matchBefore(/[\w\d_]+/);

							// Show suggestions if:
							// 1. There's a word match
							// 2. The input is empty (cursor at start)
							// 3. The user explicitly triggered completion
							if (word || cursorPos === 0 || context.explicit) {
								return {
									from: word ? word.from : cursorPos,
									options: availableOperators,
								};
							}
						}

						return null;
					},
				],
				defaultKeymap: true,
				closeOnBlur: true,
				maxRenderedOptions: 50,
				activateOnTyping: true,
			}),
		[operatorCompletions, isLoadingFields, fieldSuggestions, functionArgPairs],
	);

	return (
		<div className="query-aggregation-select-container">
			<CodeMirror
				value={input}
				onChange={(value): void => {
					setInput(value);
					onChange?.(value);
				}}
				className="query-aggregation-select-editor"
				theme={copilot}
				extensions={[
					chipPlugin,
					aggregatorAutocomplete,
					javascript({ jsx: false, typescript: false }),
					EditorView.lineWrapping,
					stopEventsExtension,
					keymap.of([
						...completionKeymap,
						{
							key: 'Escape',
							run: closeCompletion,
						},
					]),
				]}
				placeholder="Type aggregator functions like sum(), count_distinct(...), etc."
				basicSetup={{
					lineNumbers: false,
					autocompletion: true,
					completionKeymap: true,
				}}
				onUpdate={handleUpdate}
				onCreateEditor={(view: EditorView): void => {
					editorRef.current = view;
				}}
				onFocus={(): void => {
					setIsFocused(true);
					safeStartCompletion();
				}}
				onBlur={(): void => {
					setIsFocused(false);

					if (editorRef.current) {
						closeCompletion(editorRef.current);
					}
				}}
			/>
		</div>
	);
}

QueryAggregationSelect.defaultProps = {
	onChange: undefined,
};

export default QueryAggregationSelect;
