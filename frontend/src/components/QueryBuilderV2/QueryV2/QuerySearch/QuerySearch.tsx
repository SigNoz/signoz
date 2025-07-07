import './QuerySearch.styles.scss';

import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
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
import CodeMirror, {
	EditorView,
	Extension,
	keymap,
} from '@uiw/react-codemirror';
import { Card, Collapse, Space, Tag, Typography } from 'antd';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	IDetailedError,
	IQueryContext,
	IValidationResult,
} from 'types/antlrQueryTypes';
import { QueryKeySuggestionsProps } from 'types/api/querySuggestions/types';
import { queryOperatorSuggestions, validateQuery } from 'utils/antlrQueryUtils';
import { getQueryContextAtCursor } from 'utils/queryContextUtils';

import { queryExamples } from './constants';

const { Text } = Typography;
const { Panel } = Collapse;

// Custom extension to stop events
const stopEventsExtension = EditorView.domEventHandlers({
	keydown: (event) => {
		event.stopPropagation();
		// Optionally: event.preventDefault();
		return false; // Important for CM to know you handled it
	},
	input: (event) => {
		event.stopPropagation();
		return false;
	},
});

const disallowMultipleSpaces: Extension = EditorView.inputHandler.of(
	(view, from, to, text) => {
		const currentLine = view.state.doc.lineAt(from);
		const before = currentLine.text.slice(0, from - currentLine.from);
		const after = currentLine.text.slice(to - currentLine.from);

		const newText = before + text + after;

		return /\s{2,}/.test(newText);
	},
);

// eslint-disable-next-line sonarjs/cognitive-complexity
function QuerySearch(): JSX.Element {
	const [query, setQuery] = useState<string>('');
	const [valueSuggestions, setValueSuggestions] = useState<any[]>([
		{ label: 'error', type: 'value' },
		{ label: 'frontend', type: 'value' },
	]);
	const [activeKey, setActiveKey] = useState<string>('');
	const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
	const [queryContext, setQueryContext] = useState<IQueryContext | null>(null);
	const [validation, setValidation] = useState<IValidationResult>({
		isValid: false,
		message: '',
		errors: [],
	});

	const [keySuggestions, setKeySuggestions] = useState<
		QueryKeySuggestionsProps[] | null
	>(null);

	const [showExamples] = useState(false);

	const [cursorPos, setCursorPos] = useState({ line: 0, ch: 0 });
	const [isFocused, setIsFocused] = useState(false);

	const lastPosRef = useRef<{ line: number; ch: number }>({ line: 0, ch: 0 });

	// Reference to the editor view for programmatic autocompletion
	const editorRef = useRef<EditorView | null>(null);
	const lastKeyRef = useRef<string>('');
	const isMountedRef = useRef<boolean>(true);

	const { data: queryKeySuggestions } = useGetQueryKeySuggestions({
		signal: 'traces',
	});

	// Add a state for tracking editing mode
	const [editingMode, setEditingMode] = useState<
		| 'key'
		| 'operator'
		| 'value'
		| 'conjunction'
		| 'function'
		| 'parenthesis'
		| 'bracketList'
		| null
	>(null);

	// Helper function to wrap string values in quotes if they aren't already quoted
	const wrapStringValueInQuotes = (value: string): string => {
		// If value is already quoted (with single quotes), return as is
		if (/^'.*'$/.test(value)) {
			return value;
		}

		// If value contains single quotes, escape them and wrap in single quotes
		if (value.includes("'")) {
			// Replace single quotes with escaped single quotes
			const escapedValue = value.replace(/'/g, "\\'");
			return `'${escapedValue}'`;
		}

		// Otherwise, simply wrap in single quotes
		return `'${value}'`;
	};

	// Helper function to check if operator is for list operations (IN, NOT IN, etc.)
	const isListOperator = (op: string | undefined): boolean => {
		if (!op) return false;
		return op.toUpperCase() === 'IN' || op.toUpperCase() === 'NOT IN';
	};

	// Helper function to format value based on operator type and value type
	const formatValueForOperator = (
		value: string,
		operatorToken: string | undefined,
		type: string,
	): string => {
		// If operator requires a list and value isn't already in list format
		if (isListOperator(operatorToken) && !value.startsWith('[')) {
			// For string values, wrap in quotes first, then in brackets
			if (type === 'value' || type === 'keyword') {
				const quotedValue = wrapStringValueInQuotes(value);
				return `[${quotedValue}]`;
			}
			// For numbers, just wrap in brackets
			return `[${value}]`;
		}

		// If we're already inside bracket list for IN operator and it's a string value
		// just wrap in quotes but not brackets (we're already in brackets)
		if (type === 'value' || type === 'keyword') {
			return wrapStringValueInQuotes(value);
		}

		return value;
	};

	// Add cleanup effect to prevent component updates after unmount
	useEffect(
		(): (() => void) => (): void => {
			// Mark component as unmounted to prevent state updates
			isMountedRef.current = false;
		},
		[],
	);

	// Use callback to prevent dependency changes on each render
	const fetchValueSuggestions = useCallback(
		// eslint-disable-next-line sonarjs/cognitive-complexity
		async (key: string): Promise<void> => {
			if (
				!key ||
				(key === activeKey && !isLoadingSuggestions) ||
				!isMountedRef.current
			)
				return;

			// Set loading state and store the key we're fetching for
			setIsLoadingSuggestions(true);
			lastKeyRef.current = key;
			setActiveKey(key);

			setValueSuggestions([
				{
					label: 'Loading suggestions...',
					type: 'text',
					boost: -99,
					apply: (): boolean => false,
				},
			]);

			try {
				const response = await getValueSuggestions({
					key,
					signal: 'traces',
				});

				// Skip updates if component unmounted or key changed
				if (!isMountedRef.current || lastKeyRef.current !== key) {
					return; // Skip updating if key has changed or component unmounted
				}

				// Process the response data
				const responseData = response.data as any;
				const values = responseData.data?.values || {};
				const stringValues = values.stringValues || [];
				const numberValues = values.numberValues || [];

				// Generate options from string values - explicitly handle empty strings
				const stringOptions = stringValues
					// Strict filtering for empty string - we'll handle it as a special case if needed
					.filter(
						(value: string | null | undefined): value is string =>
							value !== null && value !== undefined && value !== '',
					)
					.map((value: string) => ({
						label: value,
						type: 'value',
					}));

				// Generate options from number values
				const numberOptions = numberValues
					.filter(
						(value: number | null | undefined): value is number =>
							value !== null && value !== undefined,
					)
					.map((value: number) => ({
						label: value.toString(),
						type: 'number',
					}));

				// Combine all options and make sure we don't have duplicate labels
				let allOptions = [...stringOptions, ...numberOptions];

				// Remove duplicates by label
				allOptions = allOptions.filter(
					(option, index, self) =>
						index === self.findIndex((o) => o.label === option.label),
				);

				if (lastKeyRef.current === key && isMountedRef.current) {
					if (allOptions.length > 0) {
						setValueSuggestions(allOptions);
					} else {
						setValueSuggestions([
							{
								label: 'No suggestions available',
								type: 'text',
								boost: -99,
								apply: (): boolean => false,
							},
						]);
					}

					// Force reopen the completion if editor is available
					if (editorRef.current) {
						setTimeout(() => {
							if (isMountedRef.current && editorRef.current) {
								startCompletion(editorRef.current);
							}
						}, 10);
					}
					setIsLoadingSuggestions(false);
				}
			} catch (error) {
				console.error('Error fetching suggestions:', error);
				if (lastKeyRef.current === key && isMountedRef.current) {
					setValueSuggestions([
						{
							label: 'Error loading suggestions',
							type: 'text',
							boost: -99, // Lower boost to appear at the bottom
							apply: (): boolean => false, // Prevent selection
						},
					]);
					setIsLoadingSuggestions(false);
				}
			}
		},
		[activeKey, isLoadingSuggestions],
	);

	const handleUpdate = useCallback((viewUpdate: { view: EditorView }): void => {
		if (!isMountedRef.current) return;

		if (!editorRef.current) {
			editorRef.current = viewUpdate.view;
		}

		const selection = viewUpdate.view.state.selection.main;
		const pos = selection.head;
		const doc = viewUpdate.view.state.doc.toString();

		const lineInfo = viewUpdate.view.state.doc.lineAt(pos);
		const newPos = {
			line: lineInfo.number,
			ch: pos - lineInfo.from,
		};

		const lastPos = lastPosRef.current;

		if (newPos.line !== lastPos.line || newPos.ch !== lastPos.ch) {
			setCursorPos(newPos);
			lastPosRef.current = newPos;

			if (doc) {
				const context = getQueryContextAtCursor(doc, pos);

				let newContextType:
					| 'key'
					| 'operator'
					| 'value'
					| 'conjunction'
					| 'function'
					| 'parenthesis'
					| 'bracketList'
					| null = null;

				if (context.isInKey) newContextType = 'key';
				else if (context.isInOperator) newContextType = 'operator';
				else if (context.isInValue) newContextType = 'value';
				else if (context.isInConjunction) newContextType = 'conjunction';
				else if (context.isInFunction) newContextType = 'function';
				else if (context.isInParenthesis) newContextType = 'parenthesis';
				else if (context.isInBracketList) newContextType = 'bracketList';

				setQueryContext(context);

				// Update editing mode based on context
				setEditingMode(newContextType);
			}
		}
	}, []);

	const handleQueryChange = useCallback(async (newQuery: string) => {
		setQuery(newQuery);

		try {
			const validationResponse = validateQuery(newQuery);
			setValidation(validationResponse);
		} catch (error) {
			setValidation({
				isValid: false,
				message: 'Failed to process query',
				errors: [error as IDetailedError],
			});
		}
	}, []);

	const handleChange = (value: string): void => {
		setQuery(value);
		handleQueryChange(value);
	};

	const handleExampleClick = (exampleQuery: string): void => {
		// If there's an existing query, append the example with AND
		const newQuery = query ? `${query} AND ${exampleQuery}` : exampleQuery;
		setQuery(newQuery);
		handleQueryChange(newQuery);
	};

	// Helper function to render a badge for the current context mode
	const renderContextBadge = (): JSX.Element => {
		if (!editingMode) return <Tag>Unknown</Tag>;

		switch (editingMode) {
			case 'key':
				return <Tag color="blue">Key</Tag>;
			case 'operator':
				return <Tag color="purple">Operator</Tag>;
			case 'value':
				return <Tag color="green">Value</Tag>;
			case 'conjunction':
				return <Tag color="orange">Conjunction</Tag>;
			case 'function':
				return <Tag color="cyan">Function</Tag>;
			case 'parenthesis':
				return <Tag color="magenta">Parenthesis</Tag>;
			case 'bracketList':
				return <Tag color="red">Bracket List</Tag>;
			default:
				return <Tag>Unknown</Tag>;
		}
	};

	// Enhanced myCompletions function to better use context including query pairs
	// eslint-disable-next-line sonarjs/cognitive-complexity
	function autoSuggestions(context: CompletionContext): CompletionResult | null {
		const word = context.matchBefore(/[.\w]*/);
		if (word?.from === word?.to && !context.explicit) return null;

		// Get the query context at the cursor position
		const queryContext = getQueryContextAtCursor(query, cursorPos.ch);

		// Define autocomplete options based on the context
		let options: {
			label: string;
			type: string;
			info?: string;
			apply?:
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
		): void => {
			view.dispatch({
				changes: { from, to, insert: `${completion.apply} ` },
				selection: { anchor: from + completion.apply.length + 1 },
			});
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

		// Special handling for bracket list context (for IN operator)
		if (queryContext.isInBracketList) {
			// If we're inside brackets for an IN operator, we want to show value suggestions
			// but format them differently (just add quotes, don't wrap in brackets)
			const keyName = queryContext.keyToken || queryContext.currentPair?.key || '';

			if (!keyName) {
				return null;
			}

			if (
				keyName &&
				(keyName !== activeKey || isLoadingSuggestions) &&
				!(isLoadingSuggestions && lastKeyRef.current === keyName)
			) {
				fetchValueSuggestions(keyName);
			}

			// For values in bracket list, just add quotes without enclosing in brackets
			const processedOptions = valueSuggestions.map((option) => {
				// Clone the option to avoid modifying the original
				const processedOption = { ...option };

				// Skip processing for non-selectable items
				if (option.apply === false || typeof option.apply === 'function') {
					return option;
				}

				// For strings, just wrap in quotes (no brackets needed)
				if (option.type === 'value' || option.type === 'keyword') {
					processedOption.apply = wrapStringValueInQuotes(option.label);
					processedOption.info = `Value for ${keyName} IN list`;
				} else {
					processedOption.apply = option.label;
					processedOption.info = `Value for ${keyName} IN list`;
				}

				return processedOption;
			});

			// Add space after selection
			const optionsWithSpace = addSpaceToOptions(processedOptions);

			// Return current value suggestions without comma
			return {
				from: word?.from ?? 0,
				options: optionsWithSpace,
			};
		}

		if (queryContext.isInKey) {
			const searchText = word?.text.toLowerCase() ?? '';

			options = (keySuggestions || []).filter((option) =>
				option.label.toLowerCase().includes(searchText),
			);

			// If we have previous pairs, we can prioritize keys that haven't been used yet
			if (queryContext.queryPairs && queryContext.queryPairs.length > 0) {
				const usedKeys = queryContext.queryPairs.map((pair) => pair.key);

				// Add boost to unused keys to prioritize them
				options = options.map((option) => ({
					...option,
					boost: usedKeys.includes(option.label) ? -10 : 10,
					info: usedKeys.includes(option.label)
						? `${option.info || ''} (already used in query)`
						: option.info,
				}));
			}

			// Add boost to exact matches
			options = options.map((option) => ({
				...option,
				boost:
					(option.boost || 0) +
					(option.label.toLowerCase() === searchText ? 100 : 0),
			}));

			// Add space after selection for keys
			const optionsWithSpace = addSpaceToOptions(options);

			return {
				from: word?.from ?? 0,
				to: word?.to ?? cursorPos.ch,
				options: optionsWithSpace,
			};
		}

		if (queryContext.isInOperator) {
			options = queryOperatorSuggestions;

			// Get key information from context or current pair
			const keyName = queryContext.keyToken || queryContext.currentPair?.key;

			// If we have a key context, add that info to the operator suggestions
			if (keyName) {
				// Find the key details from suggestions
				const keyDetails = (keySuggestions || []).find((k) => k.label === keyName);
				const keyType = keyDetails?.type || '';

				// Filter operators based on key type
				if (keyType) {
					if (keyType === 'number') {
						// Prioritize numeric operators
						options = options.map((op) => ({
							...op,
							boost: ['>', '<', '>=', '<=', '=', '!=', 'BETWEEN'].includes(op.label)
								? 100
								: 0,
						}));
					} else if (keyType === 'string' || keyType === 'keyword') {
						// Prioritize string operators
						options = options.map((op) => ({
							...op,
							boost: ['=', '!=', 'LIKE', 'ILIKE', 'CONTAINS', 'IN'].includes(op.label)
								? 100
								: 0,
						}));
					} else if (keyType === 'boolean') {
						// Prioritize boolean operators
						options = options.map((op) => ({
							...op,
							boost: ['=', '!='].includes(op.label) ? 100 : 0,
						}));
					}
				}

				// Add key info to all operators
				options = options.map((op) => ({
					...op,
					info: `${op.info || ''} (for ${keyName})`,
				}));
			}

			// Add space after selection for operators
			const optionsWithSpace = addSpaceToOptions(options);

			return {
				from: word?.from ?? 0,
				to: word?.to ?? cursorPos.ch,
				options: optionsWithSpace,
			};
		}

		if (queryContext.isInValue) {
			// Fetch values based on the key - use available context
			const keyName = queryContext.keyToken || queryContext.currentPair?.key || '';
			const operatorName =
				queryContext.operatorToken || queryContext.currentPair?.operator || '';

			if (!keyName) {
				return null;
			}

			// Trigger fetch only if needed
			if (
				keyName &&
				(keyName !== activeKey || isLoadingSuggestions) &&
				!(isLoadingSuggestions && lastKeyRef.current === keyName)
			) {
				fetchValueSuggestions(keyName);
			}

			// Process options to add appropriate formatting when selected
			const processedOptions = valueSuggestions.map((option) => {
				// Clone the option to avoid modifying the original
				const processedOption = { ...option };

				// Skip processing for non-selectable items
				if (option.apply === false || typeof option.apply === 'function') {
					return option;
				}

				// Format values based on their type and the operator
				if (option.type === 'value' || option.type === 'keyword') {
					// String values get quoted
					processedOption.apply = formatValueForOperator(
						option.label,
						operatorName,
						option.type,
					);

					// Add context info to the suggestion
					if (keyName && operatorName) {
						processedOption.info = `Value for ${keyName} ${operatorName}`;
					}
				} else if (option.type === 'number') {
					// Numbers don't get quoted but may need brackets for IN operators
					if (isListOperator(operatorName)) {
						processedOption.apply = `[${option.label}]`;
					} else {
						processedOption.apply = option.label;
					}

					// Add context info to the suggestion
					if (keyName && operatorName) {
						processedOption.info = `Numeric value for ${keyName} ${operatorName}`;
					}
				} else if (option.type === 'boolean') {
					// Boolean values don't get quoted
					processedOption.apply = option.label;

					// Add context info
					if (keyName && operatorName) {
						processedOption.info = `Boolean value for ${keyName} ${operatorName}`;
					}
				} else if (option.type === 'array') {
					// Arrays are already formatted as arrays
					processedOption.apply = option.label;

					// Add context info
					if (keyName && operatorName) {
						processedOption.info = `Array value for ${keyName} ${operatorName}`;
					}
				}

				return processedOption;
			});

			// Add space after selection
			const optionsWithSpace = addSpaceToOptions(processedOptions);

			// Return current value suggestions from state
			return {
				from: word?.from ?? 0,
				options: optionsWithSpace,
			};
		}

		if (queryContext.isInFunction) {
			options = [
				{ label: 'HAS', type: 'function' },
				{ label: 'HASANY', type: 'function' },
				{ label: 'HASALL', type: 'function' },
				{ label: 'HASNONE', type: 'function' },
			];

			// Add space after selection for functions
			const optionsWithSpace = addSpaceToOptions(options);

			return {
				from: word?.from ?? 0,
				options: optionsWithSpace,
			};
		}

		if (queryContext.isInConjunction) {
			options = [
				{ label: 'AND', type: 'conjunction' },
				{ label: 'OR', type: 'conjunction' },
			];

			// Add space after selection for conjunctions
			const optionsWithSpace = addSpaceToOptions(options);

			return {
				from: word?.from ?? 0,
				options: optionsWithSpace,
			};
		}

		if (queryContext.isInParenthesis) {
			// Different suggestions based on the context within parenthesis or bracket
			const curChar = query.charAt(cursorPos.ch - 1) || '';

			if (curChar === '(' || curChar === '[') {
				// Right after opening parenthesis/bracket
				if (curChar === '(') {
					// In expression context, suggest keys, functions, or nested parentheses
					options = [
						...(keySuggestions || []),
						{ label: '(', type: 'parenthesis', info: 'Open nested group' },
						{ label: 'NOT', type: 'operator', info: 'Negate expression' },
						...options.filter((opt) => opt.type === 'function'),
					];

					// Add space after selection for opening parenthesis context
					const optionsWithSpace = addSpaceToOptions(options);

					return {
						from: word?.from ?? 0,
						options: optionsWithSpace,
					};
				}

				// Inside square brackets (likely for IN operator)
				// Suggest values, commas, or closing bracket
				return {
					from: word?.from ?? 0,
					options: valueSuggestions,
				};
			}

			if (curChar === ')' || curChar === ']') {
				// After closing parenthesis/bracket, suggest conjunctions
				options = [
					{ label: 'AND', type: 'conjunction' },
					{ label: 'OR', type: 'conjunction' },
				];

				// Add space after selection for closing parenthesis context
				const optionsWithSpace = addSpaceToOptions(options);

				return {
					from: word?.from ?? 0,
					options: optionsWithSpace,
				};
			}
		}

		// If no specific context is detected, provide general suggestions
		options = [
			...(keySuggestions || []),
			{ label: 'AND', type: 'conjunction', boost: -10 },
			{ label: 'OR', type: 'conjunction', boost: -10 },
			{ label: '(', type: 'parenthesis', info: 'Open group', boost: -20 },
		];

		// Add space after selection for general context
		const optionsWithSpace = addSpaceToOptions(options);

		return {
			from: word?.from ?? 0,
			options: optionsWithSpace,
		};
	}

	// Add back the generateOptions function and useEffect
	const generateOptions = (data: any): any[] =>
		Object.values(data.keys).flatMap((items: any) =>
			items.map(({ name, fieldDataType, fieldContext }: any) => ({
				label: name,
				type: fieldDataType === 'string' ? 'keyword' : fieldDataType,
				info: fieldContext,
				details: '',
			})),
		);

	// Effect to handle focus state and trigger suggestions
	useEffect(() => {
		if (isFocused && editorRef.current) {
			startCompletion(editorRef.current);
		}
	}, [isFocused]);

	useEffect(() => {
		if (queryKeySuggestions) {
			const options = generateOptions(queryKeySuggestions.data.data);
			setKeySuggestions(options);
		}
	}, [queryKeySuggestions]);

	useEffect(() => {
		if (!queryContext) return;

		// Trigger suggestions based on context
		if (editorRef.current) {
			// Small delay to ensure the context is fully updated
			setTimeout(() => {
				if (editorRef.current) {
					startCompletion(editorRef.current);
				}
			}, 50);
		}

		// Handle value suggestions for value context
		if (queryContext.isInValue) {
			const { keyToken, currentToken } = queryContext;
			const key = keyToken || currentToken;

			// Only fetch if needed and if we have a valid key
			if (key && key !== activeKey && !isLoadingSuggestions) {
				fetchValueSuggestions(key);
			}
		}
	}, [queryContext, activeKey, isLoadingSuggestions, fetchValueSuggestions]);

	return (
		<div className="code-mirror-where-clause">
			{editingMode && (
				<div className={`context-indicator context-indicator-${editingMode}`}>
					Currently editing: {renderContextBadge()}
					{queryContext?.keyToken && (
						<span className="triplet-info">
							Key: <Tag>{queryContext.keyToken}</Tag>
						</span>
					)}
					{queryContext?.operatorToken && (
						<span className="triplet-info">
							Operator: <Tag>{queryContext.operatorToken}</Tag>
						</span>
					)}
					{queryContext?.valueToken && (
						<span className="triplet-info">
							Value: <Tag>{queryContext.valueToken}</Tag>
						</span>
					)}
					{queryContext?.currentPair && (
						<span className="triplet-info query-pair-info">
							Current pair: <Tag color="blue">{queryContext.currentPair.key}</Tag>
							<Tag color="purple">{queryContext.currentPair.operator}</Tag>
							{queryContext.currentPair.value && (
								<Tag color="green">{queryContext.currentPair.value}</Tag>
							)}
							<Tag color={queryContext.currentPair.isComplete ? 'success' : 'warning'}>
								{queryContext.currentPair.isComplete ? 'Complete' : 'Incomplete'}
							</Tag>
						</span>
					)}
					{queryContext?.queryPairs && queryContext.queryPairs.length > 0 && (
						<span className="triplet-info">
							Total pairs: <Tag color="blue">{queryContext.queryPairs.length}</Tag>
						</span>
					)}
				</div>
			)}

			<CodeMirror
				value={query}
				theme={copilot}
				onChange={handleChange}
				onUpdate={handleUpdate}
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
					disallowMultipleSpaces,
					keymap.of([
						...completionKeymap,
						{
							key: 'Escape',
							run: closeCompletion,
						},
					]),
				]}
				placeholder="Enter your query (e.g., status = 'error' AND service = 'frontend')"
				basicSetup={{
					lineNumbers: false,
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

			{query && (
				<div className="query-text-preview-container">
					<Space direction="vertical" size={4}>
						<Text className="query-text-preview-title">searchExpr</Text>
						<Text className="query-text-preview">{query}</Text>
					</Space>

					<div className="query-validation">
						<div className="query-validation-status">
							<Text>Status:</Text>
							<div className={validation.isValid ? 'valid' : 'invalid'}>
								{validation.isValid ? (
									<Space>
										<CheckCircleFilled /> Valid
									</Space>
								) : (
									<Space>
										<CloseCircleFilled /> Invalid
									</Space>
								)}
							</div>
						</div>

						<div className="query-validation-errors">
							{validation.errors.map((error) => (
								<div key={error.message} className="query-validation-error">
									<div className="query-validation-error-line">
										{error.line}:{error.column}
									</div>

									<div className="query-validation-error-message">{error.message}</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{showExamples && (
				<Card size="small" className="query-examples-card">
					<Collapse
						ghost
						size="small"
						className="query-examples"
						defaultActiveKey={[]}
					>
						<Panel header="Query Examples" key="1">
							<div className="query-examples-list">
								{queryExamples.map((example) => (
									<div
										className="query-example-content"
										key={example.label}
										onClick={(): void => handleExampleClick(example.query)}
										role="button"
										tabIndex={0}
										onKeyDown={(e): void => {
											if (e.key === 'Enter' || e.key === ' ') {
												handleExampleClick(example.query);
											}
										}}
									>
										<CodeMirror
											value={example.query}
											theme={copilot}
											extensions={[
												javascript({ jsx: false, typescript: false }),
												EditorView.editable.of(false),
											]}
											basicSetup={{ lineNumbers: false }}
											className="query-example-code-mirror"
										/>
									</div>
								))}
							</div>
						</Panel>
					</Collapse>
				</Card>
			)}

			{queryContext && (
				<Card size="small" title="Current Context" className="query-context">
					<div className="context-details">
						<Space direction="vertical" size={4}>
							<Space>
								<Text strong>Token:</Text>
								<Text code>{queryContext.currentToken || '-'}</Text>
							</Space>
							<Space>
								<Text strong>Type:</Text>
								<Text>{queryContext.tokenType || '-'}</Text>
							</Space>
							<Space>
								<Text strong>Context:</Text>
								{renderContextBadge()}
							</Space>

							{queryContext.keyToken && (
								<Space>
									<Text strong>Key:</Text>
									<Text code>{queryContext.keyToken}</Text>
								</Space>
							)}

							{queryContext.operatorToken && (
								<Space>
									<Text strong>Operator:</Text>
									<Text code>{queryContext.operatorToken}</Text>
								</Space>
							)}

							{queryContext.valueToken && (
								<Space>
									<Text strong>Value:</Text>
									<Text code>{queryContext.valueToken}</Text>
								</Space>
							)}
						</Space>
					</div>
				</Card>
			)}
		</div>
	);
}

export default QuerySearch;
