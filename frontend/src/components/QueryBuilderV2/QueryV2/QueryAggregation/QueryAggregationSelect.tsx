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
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
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

// eslint-disable-next-line react/no-this-in-sfc
function QueryAggregationSelect(): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const { setAggregationOptions } = useQueryBuilderV2Context();
	const queryData = currentQuery.builder.queryData[0];
	const [input, setInput] = useState('');
	const [cursorPos, setCursorPos] = useState(0);
	const [functionArgPairs, setFunctionArgPairs] = useState<
		{ func: string; arg: string }[]
	>([]);
	const editorRef = useRef<EditorView | null>(null);

	// Update cursor position on every editor update
	const handleUpdate = (update: { view: EditorView }): void => {
		const pos = update.view.state.selection.main.from;
		setCursorPos(pos);
	};

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
			args.forEach((arg) => {
				pairs.push({ func, arg });
			});
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
				const isCount = op.value === TracesAggregatorOperator.COUNT;
				const insertText = isCount ? `${op.value}() ` : `${op.value}(`;
				const cursorPos = isCount
					? from + op.value.length + 3 // after 'count() '
					: from + op.value.length + 1; // after 'operator('
				view.dispatch({
					changes: { from, to, insert: insertText },
					selection: { anchor: cursorPos },
				});
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
						view.dispatch({
							changes: { from, to, insert: completion.label },
							selection: { anchor: from + completion.label.length },
						});
					},
				}),
			) || [],
		[aggregateAttributeData],
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

						// Before returning operatorCompletions, filter out 'count' if already present in the input (case-insensitive, direct text check)
						if (!funcName || !operatorArgMeta[funcName]?.acceptsArgs) {
							// Check if 'count(' is present in the current input (case-insensitive)
							const hasCount = text.toLowerCase().includes('count(');
							const availableOperators = hasCount
								? operatorCompletions.filter((op) => op.label.toLowerCase() !== 'count')
								: operatorCompletions;
							const word = context.matchBefore(/[\w\d_]+/);
							if (!word && !context.explicit) {
								return null;
							}
							return {
								from: word ? word.from : context.pos,
								options: availableOperators,
							};
						}

						return null;
					},
				],
				defaultKeymap: true,
				closeOnBlur: false,
				maxRenderedOptions: 50,
				activateOnTyping: true,
			}),
		[operatorCompletions, isLoadingFields, fieldSuggestions, functionArgPairs],
	);

	return (
		<div className="query-aggregation-select-container">
			<CodeMirror
				value={input}
				onChange={setInput}
				className="query-aggregation-select-editor"
				width="100%"
				theme={copilot}
				extensions={[
					chipPlugin,
					aggregatorAutocomplete,
					javascript({ jsx: false, typescript: false }),
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
				ref={editorRef}
			/>
		</div>
	);
}

export default QueryAggregationSelect;
