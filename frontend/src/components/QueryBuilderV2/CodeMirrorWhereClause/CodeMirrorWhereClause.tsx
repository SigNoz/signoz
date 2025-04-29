/* eslint-disable sonarjs/no-collapsible-if */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-nested-ternary */

import './CodeMirrorWhereClause.styles.scss';

import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import {
	autocompletion,
	CompletionContext,
	CompletionResult,
	startCompletion,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { copilot } from '@uiw/codemirror-theme-copilot';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { Card, Collapse, Space, Typography } from 'antd';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	IDetailedError,
	IQueryContext,
	IValidationResult,
} from 'types/antlrQueryTypes';
import { QueryKeySuggestionsProps } from 'types/api/querySuggestions/types';
import {
	getQueryContextAtCursor,
	queryOperatorSuggestions,
	validateQuery,
} from 'utils/antlrQueryUtils';

const { Text } = Typography;
const { Panel } = Collapse;

const queryExamples = [
	{
		label: 'Basic Query',
		query: "status = 'error'",
		description: 'Find all errors',
	},
	{
		label: 'Multiple Conditions',
		query: "status = 'error' AND service = 'frontend'",
		description: 'Find errors from frontend service',
	},
	{
		label: 'IN Operator',
		query: "status IN ['error', 'warning']",
		description: 'Find items with specific statuses',
	},
	{
		label: 'Function Usage',
		query: "HAS(service, 'frontend')",
		description: 'Use HAS function',
	},
	{
		label: 'Numeric Comparison',
		query: 'duration > 1000',
		description: 'Find items with duration greater than 1000ms',
	},
	{
		label: 'Range Query',
		query: 'duration BETWEEN 100 AND 1000',
		description: 'Find items with duration between 100ms and 1000ms',
	},
	{
		label: 'Pattern Matching',
		query: "service LIKE 'front%'",
		description: 'Find services starting with "front"',
	},
	{
		label: 'Complex Conditions',
		query: "(status = 'error' OR status = 'warning') AND service = 'frontend'",
		description: 'Find errors or warnings from frontend service',
	},
	{
		label: 'Multiple Functions',
		query: "HAS(service, 'frontend') AND HAS(status, 'error')",
		description: 'Use multiple HAS functions',
	},
	{
		label: 'NOT Operator',
		query: "NOT status = 'success'",
		description: 'Find items that are not successful',
	},
	{
		label: 'Array Contains',
		query: "tags CONTAINS 'production'",
		description: 'Find items with production tag',
	},
	{
		label: 'Regex Pattern',
		query: "service REGEXP '^prod-.*'",
		description: 'Find services matching regex pattern',
	},
	{
		label: 'Null Check',
		query: 'error IS NULL',
		description: 'Find items without errors',
	},
	{
		label: 'Multiple Attributes',
		query:
			"service = 'frontend' AND environment = 'production' AND status = 'error'",
		description: 'Find production frontend errors',
	},
	{
		label: 'Nested Conditions',
		query:
			"(service = 'frontend' OR service = 'backend') AND (status = 'error' OR status = 'warning')",
		description: 'Find errors or warnings from frontend or backend',
	},
];

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

function CodeMirrorWhereClause(): JSX.Element {
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

	const [cursorPos, setCursorPos] = useState({ line: 0, ch: 0 });
	const lastPosRef = useRef<{ line: number; ch: number }>({ line: 0, ch: 0 });

	// Reference to the editor view for programmatic autocompletion
	const editorRef = useRef<EditorView | null>(null);
	const lastKeyRef = useRef<string>('');

	const { data: queryKeySuggestions } = useGetQueryKeySuggestions({
		signal: 'traces',
	});

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

		// For regular string values with regular operators
		if (
			(type === 'value' || type === 'keyword') &&
			!isListOperator(operatorToken)
		) {
			return wrapStringValueInQuotes(value);
		}

		return value;
	};

	// Use callback to prevent dependency changes on each render
	const fetchValueSuggestions = useCallback(
		async (key: string): Promise<void> => {
			if (!key || (key === activeKey && !isLoadingSuggestions)) return;

			// Set loading state and store the key we're fetching for
			setIsLoadingSuggestions(true);
			lastKeyRef.current = key;
			setActiveKey(key);

			// Replace current suggestions with loading indicator
			setValueSuggestions([
				{
					label: 'Loading suggestions...',
					type: 'text',
					boost: -99, // Lower boost to appear at the bottom
					apply: (): boolean => false, // Prevent selection
				},
			]);

			try {
				const response = await getValueSuggestions({
					key,
					signal: 'traces',
				});

				// Verify we're still on the same key (user hasn't moved on)
				if (lastKeyRef.current !== key) {
					return; // Skip updating if key has changed
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

				// Only if we're still on the same key
				if (lastKeyRef.current === key) {
					if (allOptions.length > 0) {
						setValueSuggestions(allOptions);
					} else {
						setValueSuggestions([
							{
								label: 'No suggestions available',
								type: 'text',
								boost: -99, // Lower boost to appear at the bottom
								apply: (): boolean => false, // Prevent selection
							},
						]);
					}

					// Force reopen the completion if editor is available
					if (editorRef.current) {
						setTimeout(() => {
							startCompletion(editorRef.current!);
						}, 10);
					}
					setIsLoadingSuggestions(false);
				}
			} catch (error) {
				console.error('Error fetching suggestions:', error);
				if (lastKeyRef.current === key) {
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

	const handleUpdate = (viewUpdate: { view: EditorView }): void => {
		// Store editor reference
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

		const lastPos = lastPosRef.current;

		// Only update if cursor position actually changed
		if (newPos.line !== lastPos.line || newPos.ch !== lastPos.ch) {
			setCursorPos(newPos);
			lastPosRef.current = newPos;
		}
	};

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

	useEffect(() => {
		if (query) {
			const context = getQueryContextAtCursor(query, cursorPos.ch);
			setQueryContext(context as IQueryContext);
		}
	}, [query, cursorPos]);

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

	// const renderContextBadge = (): JSX.Element | null => {
	// 	if (!queryContext) return null;

	// 	let color = 'black';
	// 	let text = 'Unknown';

	// 	if (queryContext.isInKey) {
	// 		color = 'blue';
	// 		text = 'Key';
	// 	} else if (queryContext.isInOperator) {
	// 		color = 'purple';
	// 		text = 'Operator';
	// 	} else if (queryContext.isInValue) {
	// 		color = 'green';
	// 		text = 'Value';
	// 	} else if (queryContext.isInFunction) {
	// 		color = 'orange';
	// 		text = 'Function';
	// 	} else if (queryContext.isInConjunction) {
	// 		color = 'magenta';
	// 		text = 'Conjunction';
	// 	} else if (queryContext.isInParenthesis) {
	// 		color = 'grey';
	// 		text = 'Parenthesis';
	// 	}

	// 	return <Badge color={color} text={text} />;
	// };

	function myCompletions(context: CompletionContext): CompletionResult | null {
		const word = context.matchBefore(/[.\w]*/);
		if (word?.from === word?.to && !context.explicit) return null;

		// Get the query context at the cursor position
		const queryContext = getQueryContextAtCursor(query, cursorPos.ch);

		// Define autocomplete options based on the context
		let options: {
			label: string;
			type: string;
			info?: string;
			apply?: string;
			detail?: string;
		}[] = [];

		if (queryContext.isInKey) {
			const searchText = word?.text.toLowerCase() ?? '';

			options = (keySuggestions || []).filter((option) =>
				option.label.toLowerCase().includes(searchText),
			);

			return {
				from: word?.from ?? 0,
				to: word?.to ?? cursorPos.ch,
				options,
			};
		}

		if (queryContext.isInOperator) {
			options = [];
			options = queryOperatorSuggestions;
			return {
				from: word?.from ?? 0,
				to: word?.to ?? cursorPos.ch,
				options,
			};
		}

		if (queryContext.isInValue) {
			// Fetch values based on the key - use the keyToken if available
			const { keyToken, currentToken, operatorToken } = queryContext;
			const key = keyToken || currentToken;

			// Trigger fetch only if key is different from activeKey or if we're still loading
			if (key && (key !== activeKey || isLoadingSuggestions)) {
				// Don't trigger a new fetch if we're already loading for this key
				if (!(isLoadingSuggestions && lastKeyRef.current === key)) {
					fetchValueSuggestions(key);
				}
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
						operatorToken,
						option.type,
					);
				} else if (option.type === 'number') {
					// Numbers don't get quoted but may need brackets for IN operators
					if (isListOperator(operatorToken)) {
						processedOption.apply = `[${option.label}]`;
					} else {
						processedOption.apply = option.label;
					}
				} else if (option.type === 'boolean') {
					// Boolean values don't get quoted
					processedOption.apply = option.label;
				} else if (option.type === 'array') {
					// Arrays are already formatted as arrays
					processedOption.apply = option.label;
				}

				return processedOption;
			});

			// Return current value suggestions from state
			return {
				from: word?.from ?? 0,
				options: processedOptions,
			};
		}

		if (queryContext.isInFunction) {
			options = [
				{ label: 'HAS', type: 'function' },
				{ label: 'HASANY', type: 'function' },
				{ label: 'HASALL', type: 'function' },
				{ label: 'HASNONE', type: 'function' },
			];
			return {
				from: word?.from ?? 0,
				options,
			};
		}

		if (queryContext.isInConjunction) {
			options = [
				{ label: 'AND', type: 'conjunction' },
				{ label: 'OR', type: 'conjunction' },
			];
			return {
				from: word?.from ?? 0,
				options,
			};
		}

		if (queryContext.isInParenthesis) {
			// Different suggestions based on the context within parenthesis or bracket
			const curChar = query.charAt(cursorPos.ch - 1) || '';

			if (curChar === '(' || curChar === '[') {
				// Right after opening parenthesis/bracket
				if (curChar === '(') {
					// In expression context, suggest keys, functions, or nested parentheses
					return {
						from: word?.from ?? 0,
						options: [
							...(keySuggestions || []),
							{ label: '(', type: 'parenthesis', info: 'Open nested group' },
							{ label: 'NOT', type: 'operator', info: 'Negate expression' },
							...options.filter((opt) => opt.type === 'function'),
						],
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
				return {
					from: word?.from ?? 0,
					options: [
						{ label: 'AND', type: 'conjunction' },
						{ label: 'OR', type: 'conjunction' },
					],
				};
			}
		}

		return {
			from: word?.from ?? 0,
			options: [],
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

	useEffect(() => {
		if (queryKeySuggestions) {
			const options = generateOptions(queryKeySuggestions.data.data);
			setKeySuggestions(options);
		}
	}, [queryKeySuggestions]);

	// Update state when query context changes to trigger suggestion refresh
	useEffect(() => {
		if (queryContext?.isInValue) {
			const { keyToken, currentToken } = queryContext;
			const key = keyToken || currentToken;

			if (key && (key !== activeKey || isLoadingSuggestions)) {
				// Don't trigger a new fetch if we're already loading for this key
				if (!(isLoadingSuggestions && lastKeyRef.current === key)) {
					fetchValueSuggestions(key);
				}
			}

			// We're no longer automatically adding quotes here - they will be added
			// only when a specific value is selected from the dropdown
		}
	}, [queryContext, activeKey, fetchValueSuggestions, isLoadingSuggestions]);

	return (
		<div className="code-mirror-where-clause">
			<CodeMirror
				value={query}
				theme={copilot}
				onChange={handleChange}
				onUpdate={handleUpdate}
				autoFocus
				placeholder="Enter your query (e.g., status = 'error' AND service = 'frontend')"
				extensions={[
					autocompletion({
						override: [myCompletions],
						defaultKeymap: true,
						closeOnBlur: false,
						activateOnTyping: true,
						maxRenderedOptions: 50,
					}),
					javascript({ jsx: false, typescript: false }),
					EditorView.lineWrapping,
					stopEventsExtension,
					// customTheme,
				]}
				basicSetup={{
					lineNumbers: false,
				}}
			/>

			{query && (
				<Card size="small">
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
				</Card>
			)}

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

			{/* {queryContext && (
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
			)} */}
		</div>
	);
}

export default CodeMirrorWhereClause;
