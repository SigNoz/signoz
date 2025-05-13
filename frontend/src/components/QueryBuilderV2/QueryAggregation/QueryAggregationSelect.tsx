/* eslint-disable sonarjs/cognitive-complexity */
import './QueryAggregation.styles.scss';

import {
	autocompletion,
	Completion,
	CompletionContext,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { copilot } from '@uiw/codemirror-theme-copilot';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { tracesAggregateOperatorOptions } from 'constants/queryBuilderOperators';
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

const fieldSuggestions: Completion[] = [
	{ label: 'duration', type: 'variable' },
	{ label: 'status_code', type: 'variable' },
	{ label: 'service_name', type: 'variable' },
	{ label: 'trace_id', type: 'variable' },
];

const mapToFunctionCompletions = (
	operators: typeof tracesAggregateOperatorOptions,
): Completion[] =>
	operators.map((op) => ({
		label: `${op.value}()`,
		type: 'function',
		apply: `${op.value}()`,
	}));

const applyFieldSuggestion = (
	view: EditorView,
	suggestion: Completion,
): void => {
	const currentText = view.state.sliceDoc(0, view.state.selection.main.from);
	const endPos = view.state.selection.main.from;

	// Find the last opening parenthesis before the cursor
	const lastOpenParen = currentText.lastIndexOf('(');
	if (lastOpenParen === -1) return;

	// Find the last comma after the opening parenthesis
	const textAfterParen = currentText.slice(lastOpenParen);
	const lastComma = textAfterParen.lastIndexOf(',');

	// Calculate the start position for insertion
	const startPos =
		lastComma === -1 ? lastOpenParen + 1 : lastOpenParen + lastComma + 1;

	// Insert the suggestion
	view.dispatch({
		changes: { from: startPos, to: endPos, insert: suggestion.label },
		selection: { anchor: startPos + suggestion.label.length },
	});
};

const applyOperatorSuggestion = (
	view: EditorView,
	from: number,
	label: string,
): void => {
	view.dispatch({
		changes: { from, insert: label },
		selection: { anchor: from + label.length },
	});
};

const getOperatorSuggestions = (
	from: number,
	operators: typeof tracesAggregateOperatorOptions,
): Completion[] =>
	mapToFunctionCompletions(operators).map((op) => ({
		...op,
		apply: (view: EditorView): void =>
			applyOperatorSuggestion(view, from, op.label),
	}));

const aggregatorAutocomplete = autocompletion({
	override: [
		(context: CompletionContext): any => {
			const word = context.matchBefore(/[\w\d_\s]*(\()?[^)]*$/);
			if (!word || (word.from === word.to && !context.explicit)) return null;

			const textBeforeCursor = context.state.sliceDoc(0, context.pos);
			const functionMatch = textBeforeCursor.match(/(\w+)\(([^)]*)$/);
			const funcName = functionMatch?.[1]?.toLowerCase();

			// Handle argument suggestions when cursor is inside parentheses
			if (funcName && operatorArgMeta[funcName]) {
				const { acceptsArgs, multiple } = operatorArgMeta[funcName];

				if (!acceptsArgs) return null;

				// Get all arguments for the current function
				const argsMatch = functionMatch?.[2];
				const argsSoFar =
					argsMatch
						?.split(',')
						.map((arg) => arg.trim())
						.filter(Boolean) || [];

				if (!multiple && argsSoFar.length >= 1) return null;

				return {
					from: context.pos,
					options: fieldSuggestions.map((suggestion) => ({
						...suggestion,
						apply: (view: EditorView): void => {
							applyFieldSuggestion(view, suggestion);
							// For count_distinct, add a comma after the field
							if (funcName === TracesAggregatorOperator.COUNT_DISTINCT.toLowerCase()) {
								const currentPos = view.state.selection.main.from;
								view.dispatch({
									changes: { from: currentPos, insert: ', ' },
									selection: { anchor: currentPos + 2 },
								});
							}
						},
					})),
				};
			}

			// Handle operator suggestions
			const isAfterCompleteFunction = textBeforeCursor.match(/\w+\([^)]*\)\s*$/);
			if (isAfterCompleteFunction) {
				return {
					from: context.pos,
					options: getOperatorSuggestions(
						context.pos,
						tracesAggregateOperatorOptions,
					),
				};
			}

			// Regular word-based suggestions
			const wordBeforeCursor = word.text.trim();
			if (wordBeforeCursor) {
				const filteredOperators = tracesAggregateOperatorOptions.filter((op) =>
					op.value.toLowerCase().startsWith(wordBeforeCursor.toLowerCase()),
				);
				return {
					from: word.from,
					options: getOperatorSuggestions(word.from, filteredOperators),
				};
			}

			// Show all options if no word before cursor
			return {
				from: word.from,
				options: getOperatorSuggestions(word.from, tracesAggregateOperatorOptions),
			};
		},
	],
});

function QueryAggregationSelect(): JSX.Element {
	return (
		<div className="query-aggregation-select-container">
			<CodeMirror
				className="query-aggregation-select-editor"
				width="100%"
				theme={copilot}
				extensions={[
					aggregatorAutocomplete,
					javascript({ jsx: false, typescript: true }),
				]}
				placeholder="Type aggregator functions like sum(), count_distinct(...), etc."
				basicSetup={{
					lineNumbers: false,
					closeBrackets: true,
					autocompletion: true,
					completionKeymap: true,
				}}
				lang="sql"
			/>
		</div>
	);
}

export default QueryAggregationSelect;
