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
import CodeMirror, { EditorView, Extension } from '@uiw/react-codemirror';
import { Badge, Card, Divider, Space, Typography } from 'antd';
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

function collapseSpacesOutsideStrings(): Extension {
	return EditorView.inputHandler.of((view, from, to, text) => {
		// Get the current line text
		const { state } = view;
		const line = state.doc.lineAt(from);

		// Find the position within the line
		const before = line.text.slice(0, from - line.from);
		const after = line.text.slice(to - line.from);

		const fullText = before + text + after;

		let insideString = false;
		let escaped = false;
		let processed = '';

		for (let i = 0; i < fullText.length; i++) {
			const char = fullText[i];

			if (char === '"' && !escaped) {
				insideString = !insideString;
			}
			if (char === '\\' && !escaped) {
				escaped = true;
			} else {
				escaped = false;
			}

			if (!insideString && char === ' ' && processed.endsWith(' ')) {
				// Collapse multiple spaces outside strings
				// Skip this space
			} else {
				processed += char;
			}
		}

		// Only dispatch if the processed text differs
		if (processed !== fullText) {
			view.dispatch({
				changes: {
					from: line.from,
					to: line.to,
					insert: processed,
				},
			});
			return true;
		}

		return false;
	});
}

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

	// Use callback to prevent dependency changes on each render
	const fetchValueSuggestions = useCallback(
		async (key: string): Promise<void> => {
			if (!key || (key === activeKey && !isLoadingSuggestions)) return;

			// Set loading state and store the key we're fetching for
			setIsLoadingSuggestions(true);
			lastKeyRef.current = key;
			setActiveKey(key);

			// Replace current suggestions with loading indicator
			setValueSuggestions([{ label: 'Loading suggestions...', type: 'text' }]);

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
							{ label: 'No suggestions available', type: 'text' },
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
						{ label: 'Error loading suggestions', type: 'text' },
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

	const renderContextBadge = (): JSX.Element | null => {
		if (!queryContext) return null;

		let color = 'black';
		let text = 'Unknown';

		if (queryContext.isInKey) {
			color = 'blue';
			text = 'Key';
		} else if (queryContext.isInOperator) {
			color = 'purple';
			text = 'Operator';
		} else if (queryContext.isInValue) {
			color = 'green';
			text = 'Value';
		} else if (queryContext.isInFunction) {
			color = 'orange';
			text = 'Function';
		} else if (queryContext.isInConjunction) {
			color = 'magenta';
			text = 'Conjunction';
		}

		// else if (queryContext.isInParenthesis) {
		// 	color = 'grey';
		// 	text = 'Parenthesis';
		// }

		return <Badge color={color} text={text} />;
	};

	function myCompletions(context: CompletionContext): CompletionResult | null {
		const word = context.matchBefore(/\w*/);
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
			options = keySuggestions || [];
			return {
				from: word?.from ?? 0,
				options,
			};
		}

		if (queryContext.isInOperator) {
			options = queryOperatorSuggestions;
			return {
				from: word?.from ?? 0,
				options,
			};
		}

		if (queryContext.isInValue) {
			// Fetch values based on the key - use the keyToken if available
			const key = queryContext.keyToken || queryContext.currentToken;

			// Trigger fetch only if key is different from activeKey or if we're still loading
			if (key && (key !== activeKey || isLoadingSuggestions)) {
				// Don't trigger a new fetch if we're already loading for this key
				if (!(isLoadingSuggestions && lastKeyRef.current === key)) {
					fetchValueSuggestions(key);
				}
			}

			// Return current value suggestions from state
			return {
				from: word?.from ?? 0,
				options: valueSuggestions,
			};
		}

		if (queryContext.isInFunction) {
			options = [
				{ label: 'HAS', type: 'function' },
				{ label: 'HASANY', type: 'function' },
				// Add more function options here
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
			const key = queryContext.keyToken || queryContext.currentToken;
			if (key && (key !== activeKey || isLoadingSuggestions)) {
				// Don't trigger a new fetch if we're already loading for this key
				if (!(isLoadingSuggestions && lastKeyRef.current === key)) {
					fetchValueSuggestions(key);
				}
			}
		}
	}, [queryContext, activeKey, fetchValueSuggestions, isLoadingSuggestions]);

	return (
		<div className="code-mirror-where-clause">
			<Card size="small">
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
						collapseSpacesOutsideStrings(),
						javascript({ jsx: false, typescript: false }),
						// customTheme,
					]}
					basicSetup={{
						lineNumbers: false,
					}}
				/>

				{query && (
					<>
						<Divider style={{ margin: '8px 0' }} />
						<Space direction="vertical" size={4}>
							<Text>Query:</Text>
							<Text code>{query}</Text>
						</Space>
					</>
				)}

				{query && (
					<>
						<Divider style={{ margin: '8px 0' }} />

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
					</>
				)}
			</Card>

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

							{/* Display the key-operator-value triplet when available */}
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

export default CodeMirrorWhereClause;
