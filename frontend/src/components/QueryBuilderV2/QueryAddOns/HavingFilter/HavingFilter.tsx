import {
	autocompletion,
	closeCompletion,
	CompletionContext,
	completionKeymap,
	CompletionResult,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { copilot } from '@uiw/codemirror-theme-copilot';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { useQueryBuilderV2Context } from 'components/QueryBuilderV2/QueryBuilderV2Context';
import { useEffect, useMemo, useRef, useState } from 'react';

const havingOperators = [
	{
		label: '=',
		value: '=',
	},
	{
		label: '!=',
		value: '!=',
	},
	{
		label: '>',
		value: '>',
	},
	{
		label: '<',
		value: '<',
	},
	{
		label: '>=',
		value: '>=',
	},
	{
		label: '<=',
		value: '<=',
	},
	{
		label: 'IN',
		value: 'IN',
	},
	{
		label: 'NOT_IN',
		value: 'NOT_IN',
	},
];

const conjunctions = [
	{ label: 'AND', value: 'AND' },
	{ label: 'OR', value: 'OR' },
];

const openBrace = { label: '(', value: '(' };
const closeBrace = { label: ')', value: ')' };

function HavingFilter(): JSX.Element {
	const { aggregationOptions } = useQueryBuilderV2Context();
	const [input, setInput] = useState('');

	const [cursorPos, setCursorPos] = useState(0);

	const editorRef = useRef<EditorView | null>(null);

	console.log('cursorPos', cursorPos);

	// Update cursor position on every editor update
	const handleUpdate = (update: { view: EditorView }): void => {
		const pos = update.view.state.selection.main.from;
		setCursorPos(pos);
	};

	const [options, setOptions] = useState<{ label: string; value: string }[]>([]);

	useEffect(() => {
		const options = [];

		for (let i = 0; i < aggregationOptions.length; i++) {
			const opt = aggregationOptions[i];

			for (let j = 0; j < havingOperators.length; j++) {
				const operator = havingOperators[j];

				options.push({
					label: `${opt.func}(${opt.arg}) ${operator.label} `,
					value: `${opt.func}(${opt.arg}) ${operator.label} `,
				});
			}
		}

		setOptions(options);
	}, [aggregationOptions]);

	// Helper to check if a string is a number
	const isNumber = (token: string): boolean => /^-?\d+(\.\d+)?$/.test(token);

	const havingAutocomplete = useMemo(() => {
		const isKeyOperator = (token: string): boolean =>
			options.some((opt) => token.startsWith(opt.value));

		// Helper to count standalone ( and ) for grouping
		const countGroupingBraces = (
			input: string,
		): { openCount: number; closeCount: number } => {
			// Remove aggregator function calls (e.g., sum(duration))
			const withoutFuncs = input.replace(/\w+\([^)]*\)/g, '');
			const openCount = (withoutFuncs.match(/\(/g) || []).length;
			const closeCount = (withoutFuncs.match(/\)/g) || []).length;
			return { openCount, closeCount };
		};

		return autocompletion({
			override: [
				(context: CompletionContext): CompletionResult | null => {
					const text = context.state.sliceDoc(0, context.pos);
					const trimmedText = text.trim();
					const tokens = trimmedText.split(/\s+/).filter(Boolean);
					const { openCount, closeCount } = countGroupingBraces(text);

					// Suggest key/operator pairs and ( for grouping
					if (
						tokens.length === 0 ||
						conjunctions.some((c) => tokens[tokens.length - 1] === c.value) ||
						tokens[tokens.length - 1] === '('
					) {
						return {
							from: context.pos,
							options: [openBrace, ...options],
						};
					}
					if (isKeyOperator(tokens[tokens.length - 1])) {
						return {
							from: context.pos,
							options: [{ label: 'Enter a number value', type: 'text', apply: '' }],
						};
					}
					// Suggest ) for grouping after a value and a space, if there are unmatched (
					if (
						tokens.length > 0 &&
						isNumber(tokens[tokens.length - 1]) &&
						text.endsWith(' ')
					) {
						return {
							from: context.pos,
							options:
								openCount > closeCount ? [closeBrace, ...conjunctions] : conjunctions,
						};
					}
					return null;
				},
			],
			defaultKeymap: true,
			closeOnBlur: false,
			maxRenderedOptions: 50,
			activateOnTyping: true,
		});
	}, [options]);

	return (
		<div className="having-filter-container">
			<div className="query-aggregation-select-container">
				<CodeMirror
					value={input}
					onChange={setInput}
					className="query-aggregation-select-editor"
					width="100%"
					theme={copilot}
					extensions={[
						havingAutocomplete,
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
		</div>
	);
}

export default HavingFilter;
