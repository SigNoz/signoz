/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable sonarjs/cognitive-complexity */
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
import { Button } from 'antd';
import { useQueryBuilderV2Context } from 'components/QueryBuilderV2/QueryBuilderV2Context';
import { X } from 'lucide-react';
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

function HavingFilter({ onClose }: { onClose: () => void }): JSX.Element {
	const { aggregationOptions } = useQueryBuilderV2Context();
	const [input, setInput] = useState('');

	const editorRef = useRef<EditorView | null>(null);

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

		return autocompletion({
			override: [
				(context: CompletionContext): CompletionResult | null => {
					const text = context.state.sliceDoc(0, context.pos);
					const trimmedText = text.trim();
					const tokens = trimmedText.split(/\s+/).filter(Boolean);

					// Suggest key/operator pairs and ( for grouping
					if (
						tokens.length === 0 ||
						conjunctions.some((c) => tokens[tokens.length - 1] === c.value) ||
						tokens[tokens.length - 1] === '('
					) {
						return {
							from: context.pos,
							options,
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
							options: conjunctions,
						};
					}
					// Suggest conjunctions after a closing parenthesis and a space
					if (
						tokens.length > 0 &&
						tokens[tokens.length - 1] === ')' &&
						text.endsWith(' ')
					) {
						return {
							from: context.pos,
							options: conjunctions,
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
					placeholder="Type Having query like count() > 10 ..."
					basicSetup={{
						lineNumbers: false,
						autocompletion: true,
						completionKeymap: true,
					}}
					ref={editorRef}
				/>
				<Button
					className="close-btn periscope-btn ghost"
					icon={<X size={16} />}
					onClick={onClose}
				/>
			</div>
		</div>
	);
}

export default HavingFilter;
