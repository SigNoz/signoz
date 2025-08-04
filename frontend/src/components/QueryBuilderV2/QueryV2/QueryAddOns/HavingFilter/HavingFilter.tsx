/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable sonarjs/cognitive-complexity */
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
import { copilot } from '@uiw/codemirror-theme-copilot';
import { githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { Button } from 'antd';
import { Having } from 'api/v5/v5';
import { useQueryBuilderV2Context } from 'components/QueryBuilderV2/QueryBuilderV2Context';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

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
	{ label: 'AND', value: 'AND ' },
	{ label: 'OR', value: 'OR ' },
];

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

function HavingFilter({
	onClose,
	onChange,
	queryData,
}: {
	onClose: () => void;
	onChange: (value: string) => void;
	queryData: IBuilderQuery;
}): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { getAggregationOptions } = useQueryBuilderV2Context();
	const aggregationOptions = getAggregationOptions(queryData.queryName);
	const having = queryData?.having as Having;
	const [input, setInput] = useState(having?.expression || '');

	useEffect(() => {
		setInput(having?.expression || '');
	}, [having?.expression]);

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

	// Helper function for applying completion with space
	const applyCompletionWithSpace = (
		view: EditorView,
		completion: Completion,
		from: number,
		to: number,
	): void => {
		const insertValue =
			typeof completion.apply === 'string' ? completion.apply : completion.label;
		const newText = `${insertValue} `;
		const newPos = from + newText.length;

		view.dispatch({
			changes: { from, to, insert: newText },
			selection: { anchor: newPos, head: newPos },
			effects: EditorView.scrollIntoView(newPos),
		});
	};

	const havingAutocomplete = useMemo(() => {
		// Helper functions for applying completions
		const forceCompletion = (view: EditorView): void => {
			setTimeout(() => {
				if (view) {
					startCompletion(view);
				}
			}, 0);
		};

		const applyValueCompletion = (
			view: EditorView,
			completion: Completion,
			from: number,
			to: number,
		): void => {
			applyCompletionWithSpace(view, completion, from, to);
			forceCompletion(view);
		};

		const applyOperatorCompletion = (
			view: EditorView,
			completion: Completion,
			from: number,
			to: number,
		): void => {
			const insertValue =
				typeof completion.apply === 'string' ? completion.apply : completion.label;
			const insertWithSpace = `${insertValue} `;
			view.dispatch({
				changes: { from, to, insert: insertWithSpace },
				selection: { anchor: from + insertWithSpace.length },
			});
			forceCompletion(view);
		};

		return autocompletion({
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

					// Close dropdown after operator to allow custom value entry
					if (isAfterOperator(tokens)) {
						return null;
					}

					// Hide suggestions while typing a value after an operator
					if (
						!text.endsWith(' ') &&
						tokens.length >= 2 &&
						havingOperators.some((op) => op.value === tokens[tokens.length - 2])
					) {
						return null;
					}

					// Suggest key/operator pairs and ( for grouping
					if (
						tokens.length === 0 ||
						conjunctions.some((c) => tokens[tokens.length - 1] === c.value.trim()) ||
						tokens[tokens.length - 1] === '('
					) {
						return {
							from: context.pos,
							options: options.map((opt) => ({
								...opt,
								apply: applyOperatorCompletion,
							})),
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
								options: filteredOptions.map((opt) => ({
									...opt,
									apply: applyOperatorCompletion,
								})),
							};
						}
					}

					// Suggest conjunctions after a value and a space
					if (
						tokens.length > 0 &&
						(isNumber(tokens[tokens.length - 1]) ||
							tokens[tokens.length - 1] === ')') &&
						text.endsWith(' ')
					) {
						return {
							from: context.pos,
							options: conjunctions.map((conj) => ({
								...conj,
								apply: applyValueCompletion,
							})),
						};
					}

					// Show all options if no other condition matches
					return {
						from: context.pos,
						options: options.map((opt) => ({
							...opt,
							apply: applyOperatorCompletion,
						})),
					};
				},
			],
			defaultKeymap: true,
			closeOnBlur: true,
			maxRenderedOptions: 200,
			activateOnTyping: true,
		});
	}, [options]);

	return (
		<div className="having-filter-container">
			<div className="having-filter-select-container">
				<CodeMirror
					value={input}
					onChange={handleChange}
					theme={isDarkMode ? copilot : githubLight}
					className="having-filter-select-editor"
					width="100%"
					extensions={[
						havingAutocomplete,
						javascript({ jsx: false, typescript: false }),
						stopEventsExtension,
						EditorView.lineWrapping,
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
					icon={<ChevronUp size={16} />}
					onClick={onClose}
				/>
			</div>
		</div>
	);
}

export default HavingFilter;
