/* eslint-disable sonarjs/cognitive-complexity */
import './QueryAggregation.styles.scss';

import {
	autocompletion,
	Completion,
	CompletionContext,
	CompletionResult,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { copilot } from '@uiw/codemirror-theme-copilot';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { tracesAggregateOperatorOptions } from 'constants/queryBuilderOperators';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TracesAggregatorOperator } from 'types/common/queryBuilder';

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

function QueryAggregationSelect(): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const queryData = currentQuery.builder.queryData[0];
	const [input, setInput] = useState('');
	const [cursorPos, setCursorPos] = useState(0);
	const editorRef = useRef<EditorView | null>(null);

	// Update cursor position on every editor update
	const handleUpdate = (update: { view: EditorView }): void => {
		const pos = update.view.state.selection.main.from;
		setCursorPos(pos);
	};

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

	const operatorCompletions: Completion[] = tracesAggregateOperatorOptions.map(
		(op) => ({
			label: op.value,
			type: 'function',
			info: op.label,
			apply: (view: EditorView): void => {
				const insertText = `${op.value}()`;
				const cursorPos = view.state.selection.main.from + op.value.length + 1; // after '('
				view.dispatch({
					changes: { from: view.state.selection.main.from, insert: insertText },
					selection: { anchor: cursorPos },
				});
			},
		}),
	);

	// Memoize field suggestions from API
	const fieldSuggestions = useMemo(
		() =>
			aggregateAttributeData?.payload?.attributeKeys?.map(
				(attributeKey: BaseAutocompleteData) => ({
					label: attributeKey.key,
					type: 'variable',
					info: attributeKey.dataType,
					apply: (view: EditorView, completion: Completion): void => {
						const currentText = view.state.sliceDoc(
							0,
							view.state.selection.main.from,
						);
						const lastOpenParen = currentText.lastIndexOf('(');
						const endPos = view.state.selection.main.from;
						// Find the last comma before the cursor, but after the last open paren
						const lastComma = currentText.lastIndexOf(',', endPos - 1);
						const startPos =
							lastComma > lastOpenParen ? lastComma + 1 : lastOpenParen + 1;
						const before = view.state.sliceDoc(startPos, endPos).trim();
						let insertText = '';
						if (before.length > 0) {
							// If there's already an argument, insert ", arg"
							insertText = `, ${completion.label}`;
						} else {
							insertText = completion.label;
						}
						view.dispatch({
							changes: { from: endPos, insert: insertText },
							selection: { anchor: endPos + insertText.length },
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
							return {
								from: cursorPos,
								options: fieldSuggestions,
							};
						}

						// Otherwise, always show function suggestions
						const word = context.matchBefore(/[\w\d_]+/);
						return {
							from: word ? word.from : context.pos,
							options: operatorCompletions,
						};
					},
				],
				defaultKeymap: true,
				closeOnBlur: false,
				maxRenderedOptions: 50,
				activateOnTyping: true,
			}),
		[operatorCompletions, isLoadingFields, fieldSuggestions],
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
					aggregatorAutocomplete,
					javascript({ jsx: false, typescript: false }),
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
