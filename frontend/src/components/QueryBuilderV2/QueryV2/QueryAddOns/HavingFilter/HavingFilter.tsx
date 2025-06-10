/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable sonarjs/cognitive-complexity */
import {
	autocompletion,
	closeCompletion,
	CompletionContext,
	completionKeymap,
	CompletionResult,
	startCompletion,
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

// Add common value suggestions
const commonValues = [
	{ label: '0', value: '0' },
	{ label: '1', value: '1' },
	{ label: '5', value: '5' },
	{ label: '10', value: '10' },
	{ label: '50', value: '50' },
	{ label: '100', value: '100' },
	{ label: '1000', value: '1000' },
];

const conjunctions = [
	{ label: 'AND', value: 'AND' },
	{ label: 'OR', value: 'OR' },
];

function HavingFilter({
	onClose,
	onChange,
}: {
	onClose: () => void;
	onChange: (value: string) => void;
}): JSX.Element {
	const { aggregationOptions } = useQueryBuilderV2Context();
	const [input, setInput] = useState('');
	const [isFocused, setIsFocused] = useState(false);

	const editorRef = useRef<EditorView | null>(null);

	const [options, setOptions] = useState<{ label: string; value: string }[]>([]);

	const handleChange = (value: string): void => {
		setInput(value);
		onChange(value);
	};

	useEffect(() => {
		if (isFocused && editorRef.current && options.length > 0) {
			startCompletion(editorRef.current);
		}
	}, [isFocused, options]);

	// Update options when aggregation options change
	useEffect(() => {
		const newOptions = [];
		for (let i = 0; i < aggregationOptions.length; i++) {
			const opt = aggregationOptions[i];
			for (let j = 0; j < havingOperators.length; j++) {
				const operator = havingOperators[j];
				newOptions.push({
					label: `${opt.func}(${opt.arg}) ${operator.label}`,
					value: `${opt.func}(${opt.arg}) ${operator.label} `,
					apply: (
						view: EditorView,
						completion: { label: string; value: string },
						from: number,
						to: number,
					): void => {
						view.dispatch({
							changes: { from, to, insert: completion.value },
							selection: { anchor: from + completion.value.length },
						});
						// Trigger value suggestions immediately after operator
						setTimeout(() => {
							startCompletion(view);
						}, 0);
					},
				});
			}
		}
		setOptions(newOptions);
	}, [aggregationOptions]);

	// Helper to check if a string is a number
	const isNumber = (token: string): boolean => /^-?\d+(\.\d+)?$/.test(token);

	// Helper to check if we're after an operator
	const isAfterOperator = (tokens: string[]): boolean => {
		if (tokens.length === 0) return false;
		const lastToken = tokens[tokens.length - 1];
		// Check if the last token is exactly an operator or ends with an operator and space
		return havingOperators.some((op) => {
			const opWithSpace = `${op.value} `;
			return lastToken === op.value || lastToken.endsWith(opWithSpace);
		});
	};

	const havingAutocomplete = useMemo(
		() =>
			autocompletion({
				override: [
					(context: CompletionContext): CompletionResult | null => {
						const text = context.state.sliceDoc(0, context.pos);
						const trimmedText = text.trim();
						const tokens = trimmedText.split(/\s+/).filter(Boolean);

						// Handle empty state when no aggregation options are available
						if (options.length === 0) {
							return {
								from: context.pos,
								options: [
									{
										label:
											'No aggregation functions available. Please add aggregation functions first.',
										type: 'text',
										apply: (): boolean => true,
									},
								],
							};
						}

						// Show value suggestions after operator - this should take precedence
						if (isAfterOperator(tokens)) {
							return {
								from: context.pos,
								options: [
									...commonValues,
									{
										label: 'Enter a custom number value',
										type: 'text',
										apply: (): boolean => true,
									},
								],
							};
						}

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

						// Show suggestions when typing
						if (tokens.length > 0) {
							const lastToken = tokens[tokens.length - 1];
							const filteredOptions = options.filter((opt) =>
								opt.label.toLowerCase().includes(lastToken.toLowerCase()),
							);
							if (filteredOptions.length > 0) {
								return {
									from: context.pos - lastToken.length,
									options: filteredOptions,
								};
							}
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

						// Show all options if no other condition matches
						return {
							from: context.pos,
							options,
						};
					},
				],
				defaultKeymap: true,
				closeOnBlur: true,
				maxRenderedOptions: 200,
				activateOnTyping: true,
			}),
		[options],
	);

	return (
		<div className="having-filter-container">
			<div className="having-filter-select-container">
				<CodeMirror
					value={input}
					onChange={handleChange}
					theme={copilot}
					className="having-filter-select-editor"
					width="100%"
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
					onCreateEditor={(view: EditorView): void => {
						editorRef.current = view;
					}}
					onFocus={(): void => {
						setIsFocused(true);
						if (editorRef.current) {
							startCompletion(editorRef.current);
						}
					}}
					onBlur={(): void => {
						setIsFocused(false);
						if (editorRef.current) {
							closeCompletion(editorRef.current);
						}
					}}
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
