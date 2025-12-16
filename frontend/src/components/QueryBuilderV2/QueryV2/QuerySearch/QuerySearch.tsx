/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/cognitive-complexity */
import './QuerySearch.styles.scss';

import { CheckCircleFilled } from '@ant-design/icons';
import {
	autocompletion,
	closeCompletion,
	CompletionContext,
	completionKeymap,
	CompletionResult,
	startCompletion,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import * as Sentry from '@sentry/react';
import { Color } from '@signozhq/design-tokens';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, { EditorView, keymap, Prec } from '@uiw/react-codemirror';
import { Button, Card, Collapse, Popover, Tag, Tooltip } from 'antd';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import cx from 'classnames';
import {
	negationQueryOperatorSuggestions,
	OPERATORS,
	QUERY_BUILDER_FUNCTIONS,
	QUERY_BUILDER_KEY_TYPES,
	QUERY_BUILDER_OPERATORS_BY_KEY_TYPE,
	queryOperatorSuggestions,
} from 'constants/antlrQueryConstants';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useDebounce from 'hooks/useDebounce';
import { debounce, isNull } from 'lodash-es';
import { Info, TriangleAlert } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	IDetailedError,
	IQueryContext,
	IValidationResult,
} from 'types/antlrQueryTypes';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';
import {
	getCurrentValueIndexAtCursor,
	getQueryContextAtCursor,
} from 'utils/queryContextUtils';
import { validateQuery } from 'utils/queryValidationUtils';
import { unquote } from 'utils/stringUtils';

import { queryExamples } from './constants';

const { Panel } = Collapse;

// Custom extension to stop events
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

interface QuerySearchProps {
	placeholder?: string;
	onChange: (value: string) => void;
	queryData: IBuilderQuery;
	dataSource: DataSource;
	signalSource?: string;
	hardcodedAttributeKeys?: QueryKeyDataSuggestionsProps[];
	onRun?: (query: string) => void;
}

function QuerySearch({
	placeholder,
	onChange,
	queryData,
	dataSource,
	onRun,
	signalSource,
	hardcodedAttributeKeys,
}: QuerySearchProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [valueSuggestions, setValueSuggestions] = useState<any[]>([]);
	const [activeKey, setActiveKey] = useState<string>('');
	const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
	const [queryContext, setQueryContext] = useState<IQueryContext | null>(null);
	const [validation, setValidation] = useState<IValidationResult>({
		isValid: false,
		message: '',
		errors: [],
	});
	const isProgrammaticChangeRef = useRef(false);
	const [isEditorReady, setIsEditorReady] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const editorRef = useRef<EditorView | null>(null);

	const handleQueryValidation = useCallback((newQuery: string): void => {
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

	const getCurrentQuery = useCallback(
		(): string => editorRef.current?.state.doc.toString() || '',
		[],
	);

	const updateEditorValue = useCallback(
		(value: string, options: { skipOnChange?: boolean } = {}): void => {
			const view = editorRef.current;
			if (!view) return;

			const currentValue = view.state.doc.toString();
			if (currentValue === value) return;

			if (options.skipOnChange) {
				isProgrammaticChangeRef.current = true;
			}

			view.dispatch({
				changes: {
					from: 0,
					to: currentValue.length,
					insert: value,
				},
				selection: {
					anchor: value.length,
				},
			});
		},
		[],
	);

	const handleEditorCreate = useCallback((view: EditorView): void => {
		editorRef.current = view;
		setIsEditorReady(true);
	}, []);

	useEffect(
		() => {
			if (!isEditorReady) return;

			const newQuery = queryData.filter?.expression || '';
			const currentQuery = getCurrentQuery();

			/* eslint-disable-next-line sonarjs/no-collapsible-if */
			if (newQuery !== currentQuery && !isFocused) {
				// Prevent clearing a non-empty editor when queryData becomes empty temporarily
				// Only update if newQuery has a value, or if both are empty (initial state)
				if (newQuery || !currentQuery) {
					updateEditorValue(newQuery, { skipOnChange: true });

					if (newQuery) {
						handleQueryValidation(newQuery);
					}
				}
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isEditorReady, queryData.filter?.expression, isFocused],
	);

	const [keySuggestions, setKeySuggestions] = useState<
		QueryKeyDataSuggestionsProps[] | null
	>(null);

	const [showExamples] = useState(false);

	const [cursorPos, setCursorPos] = useState({ line: 0, ch: 0 });

	const [
		isFetchingCompleteValuesList,
		setIsFetchingCompleteValuesList,
	] = useState<boolean>(false);

	const lastPosRef = useRef<{ line: number; ch: number }>({ line: 0, ch: 0 });

	const lastKeyRef = useRef<string>('');
	const lastFetchedKeyRef = useRef<string>('');
	const lastValueRef = useRef<string>('');
	const isMountedRef = useRef<boolean>(true);

	const { handleRunQuery } = useQueryBuilder();

	const { selectedDashboard } = useDashboard();

	const dynamicVariables = useMemo(
		() =>
			Object.values(selectedDashboard?.data?.variables || {})?.filter(
				(variable: IDashboardVariable) => variable.type === 'DYNAMIC',
			),
		[selectedDashboard],
	);

	// Add back the generateOptions function and useEffect
	const generateOptions = (keys: {
		[key: string]: QueryKeyDataSuggestionsProps[];
	}): any[] =>
		Object.values(keys).flatMap((items: QueryKeyDataSuggestionsProps[]) =>
			items.map(({ name, fieldDataType }) => ({
				label: name,
				type: fieldDataType === 'string' ? 'keyword' : fieldDataType,
				info: '',
				details: '',
			})),
		);

	// Debounce the metric name to prevent API calls on every keystroke
	const debouncedMetricName = useDebounce(
		queryData.aggregateAttribute?.key || '',
		500,
	);

	const toggleSuggestions = useCallback(
		(timeout?: number) => {
			const timeoutId = setTimeout(() => {
				if (!editorRef.current) return;
				if (isFocused) {
					startCompletion(editorRef.current);
				} else {
					closeCompletion(editorRef.current);
				}
			}, timeout);

			return (): void => clearTimeout(timeoutId);
		},
		[isFocused],
	);

	const fetchKeySuggestions = useCallback(
		async (searchText?: string): Promise<void> => {
			if (
				dataSource === DataSource.METRICS &&
				!queryData.aggregateAttribute?.key
			) {
				setKeySuggestions([]);
				return;
			}

			if (hardcodedAttributeKeys) {
				setKeySuggestions(hardcodedAttributeKeys);
				return;
			}

			lastFetchedKeyRef.current = searchText || '';

			const response = await getKeySuggestions({
				signal: dataSource,
				searchText: searchText || '',
				metricName: debouncedMetricName ?? undefined,
				signalSource: signalSource as 'meter' | '',
			});

			if (response.data.data) {
				const { keys } = response.data.data;
				const options = generateOptions(keys);
				// Use a Map to deduplicate by label and preserve order: new options take precedence
				const merged = new Map<string, QueryKeyDataSuggestionsProps>();
				options.forEach((opt) => merged.set(opt.label, opt));
				if (searchText && lastKeyRef.current !== searchText) {
					(keySuggestions || []).forEach((opt) => {
						if (!merged.has(opt.label)) merged.set(opt.label, opt);
					});
				}
				setKeySuggestions(Array.from(merged.values()));

				// Force reopen the completion if editor is available and focused
				if (editorRef.current) {
					toggleSuggestions(10);
				}
			}
		},
		[
			dataSource,
			debouncedMetricName,
			keySuggestions,
			toggleSuggestions,
			queryData.aggregateAttribute?.key,
			signalSource,
			hardcodedAttributeKeys,
		],
	);

	const debouncedFetchKeySuggestions = useMemo(
		() => debounce(fetchKeySuggestions, 300),
		[fetchKeySuggestions],
	);

	useEffect(() => {
		setKeySuggestions([]);
		debouncedFetchKeySuggestions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dataSource, debouncedMetricName]);

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
		async ({
			key,
			searchText,
			fetchingComplete = false,
		}: {
			key: string;
			searchText?: string;
			fetchingComplete?: boolean;
		}): Promise<void> => {
			if (
				!key ||
				(key === activeKey && !isLoadingSuggestions && !fetchingComplete) ||
				!isMountedRef.current
			)
				return;

			// Set loading state and store the key we're fetching for
			setIsLoadingSuggestions(true);
			if (fetchingComplete) {
				setIsFetchingCompleteValuesList(true);
			}
			lastKeyRef.current = key;
			lastValueRef.current = searchText || '';
			setActiveKey(key);

			setValueSuggestions([
				{
					label: 'Loading suggestions...',
					type: 'text',
					boost: -99,
					apply: (): boolean => false,
				},
			]);

			// Force reopen the completion if editor is available and focused
			if (editorRef.current) {
				toggleSuggestions(10);
			}

			const sanitizedSearchText = searchText ? searchText?.trim() : '';

			try {
				const response = await getValueSuggestions({
					key,
					searchText: sanitizedSearchText,
					signal: dataSource,
					signalSource: signalSource as 'meter' | '',
					metricName: debouncedMetricName ?? undefined,
				});

				// Skip updates if component unmounted or key changed
				if (
					!isMountedRef.current ||
					lastKeyRef.current !== key ||
					lastValueRef.current !== sanitizedSearchText
				) {
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
						apply: value,
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
						apply: value,
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

					// Force reopen the completion if editor is available and focused
					if (editorRef.current) {
						toggleSuggestions(10);
					}
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
				}
			} finally {
				setIsLoadingSuggestions(false);
				setIsFetchingCompleteValuesList(false);
			}
		},
		[
			activeKey,
			dataSource,
			isLoadingSuggestions,
			debouncedMetricName,
			signalSource,
			toggleSuggestions,
		],
	);

	const debouncedFetchValueSuggestions = useMemo(
		() => debounce(fetchValueSuggestions, 300),
		[fetchValueSuggestions],
	);

	const handleUpdate = useCallback((viewUpdate: { view: EditorView }): void => {
		if (!isMountedRef.current) return;

		if (!editorRef.current) {
			editorRef.current = viewUpdate.view;
			setIsEditorReady(true);
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
			setCursorPos((lastPos) => {
				if (newPos.ch !== lastPos.ch && newPos.ch === 0) {
					Sentry.captureEvent({
						message: `Cursor jumped to start of line from ${lastPos.ch} to ${newPos.ch}`,
						level: 'warning',
					});
				}
				return newPos;
			});
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

	const handleChange = (value: string): void => {
		if (isProgrammaticChangeRef.current) {
			isProgrammaticChangeRef.current = false;
			return;
		}

		onChange(value);
	};

	const handleBlur = (): void => {
		const currentQuery = getCurrentQuery();
		handleQueryValidation(currentQuery);
		setIsFocused(false);
	};

	useEffect(
		() => (): void => {
			if (debouncedFetchValueSuggestions) {
				debouncedFetchValueSuggestions.cancel();
			}
			if (debouncedFetchKeySuggestions) {
				debouncedFetchKeySuggestions.cancel();
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleExampleClick = (exampleQuery: string): void => {
		// If there's an existing query, append the example with AND
		const currentQuery = getCurrentQuery();
		const newQuery = currentQuery
			? `${currentQuery} AND ${exampleQuery}`
			: exampleQuery;
		updateEditorValue(newQuery);
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
		// This matches words before the cursor position
		// eslint-disable-next-line no-useless-escape
		const word = context.matchBefore(/[a-zA-Z0-9_.:/?&=#%\-\[\]]*/);
		if (word?.from === word?.to && !context.explicit) return null;

		// Get current query from editor
		const currentQuery = editorRef.current?.state.doc.toString() || '';
		// Get the query context at the cursor position
		const queryContext = getQueryContextAtCursor(currentQuery, cursorPos.ch);

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
			shouldAddSpace = true,
		): void => {
			view.dispatch({
				changes: {
					from,
					to,
					insert: shouldAddSpace ? `${completion.apply} ` : `${completion.apply}`,
				},
				selection: {
					anchor:
						from +
						(shouldAddSpace ? completion.apply.length + 1 : completion.apply.length),
				},
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
						let shouldDefaultApply = true;

						// Changes to replace the value in-place with the existing value
						const isValueType = queryContext.isInValue && option.type === 'value';
						const isOperatorType =
							queryContext.isInOperator && option.type === 'operator';
						const pair = queryContext.currentPair;

						if (isValueType) {
							if (queryContext.isInBracketList && pair?.valuesPosition) {
								const idx = getCurrentValueIndexAtCursor(
									pair.valuesPosition,
									cursorPos.ch,
								);
								if (!isNull(idx)) {
									const { start, end } = pair.valuesPosition[idx];
									if (
										typeof start === 'number' &&
										typeof end === 'number' &&
										cursorPos.ch >= start &&
										cursorPos.ch <= end + 1
									) {
										shouldDefaultApply = false;
										addSpaceAfterSelection(
											view,
											{ apply: originalApply },
											start,
											end + 1,
											false,
										);
									}
								}
							} else if (pair?.position) {
								const { valueStart, valueEnd } = pair.position;
								if (
									typeof valueStart === 'number' &&
									typeof valueEnd === 'number' &&
									cursorPos.ch >= valueStart &&
									cursorPos.ch <= valueEnd + 1
								) {
									shouldDefaultApply = false;
									addSpaceAfterSelection(
										view,
										{ apply: originalApply },
										valueStart,
										valueEnd + 1,
										false,
									);
								}
							}
						}

						// Changes to replace the operator in-place with the existing operator
						if (isOperatorType && pair?.position) {
							const { operatorStart, operatorEnd } = pair.position;
							if (
								typeof operatorStart === 'number' &&
								typeof operatorEnd === 'number' &&
								operatorStart !== 0 &&
								operatorEnd !== 0 &&
								cursorPos.ch >= operatorStart &&
								cursorPos.ch <= operatorEnd + 1
							) {
								shouldDefaultApply = false;
								addSpaceAfterSelection(
									view,
									{ apply: originalApply },
									operatorStart,
									operatorEnd + 1,
									false,
								);
							}
						}

						if (shouldDefaultApply) {
							addSpaceAfterSelection(view, { apply: originalApply }, from, to);
						}
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

			let searchText = '';

			if (
				queryContext.currentPair &&
				queryContext.currentPair.valuesPosition &&
				queryContext.currentPair.valueList
			) {
				const { valuesPosition, valueList } = queryContext.currentPair;
				const idx = getCurrentValueIndexAtCursor(valuesPosition, cursorPos.ch);
				searchText = isNull(idx)
					? ''
					: unquote(valueList[idx]).toLowerCase().trim();
			}

			options = (valueSuggestions || []).filter((option) =>
				option.label.toLowerCase().includes(searchText),
			);

			const shouldFetch =
				// Fetch only if key is available
				keyName &&
				// Fetch if either there's no suggestion left with the current searchText or searchText is empty
				(((options.length === 0 || searchText === '') &&
					lastValueRef.current !== searchText &&
					!isFetchingCompleteValuesList) ||
					keyName !== activeKey ||
					isLoadingSuggestions) &&
				!(isLoadingSuggestions && lastKeyRef.current === keyName);

			if (shouldFetch) {
				debouncedFetchValueSuggestions({
					key: keyName,
					searchText,
					fetchingComplete: true,
				});
			}

			// For values in bracket list, just add quotes without enclosing in brackets
			const processedOptions = options.map((option) => {
				// Clone the option to avoid modifying the original
				const processedOption = { ...option };

				// Skip processing for non-selectable items
				if (!option.apply || typeof option.apply === 'function') {
					return option;
				}

				// For strings, just wrap in quotes (no brackets needed)
				if (option.type === 'value' || option.type === 'keyword') {
					processedOption.apply = wrapStringValueInQuotes(option.label);
				} else {
					processedOption.apply = option.label;
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
			const searchText = word?.text.toLowerCase().trim() ?? '';

			options = (keySuggestions || []).filter((option) =>
				option.label.toLowerCase().includes(searchText),
			);

			if (options.length === 0 && lastFetchedKeyRef.current !== searchText) {
				debouncedFetchKeySuggestions(searchText);
			}

			// If we have previous pairs, we can prioritize keys that haven't been used yet
			if (queryContext.queryPairs && queryContext.queryPairs.length > 0) {
				const usedKeys = queryContext.queryPairs.map((pair) => pair.key);

				// Add boost to unused keys to prioritize them
				options = options.map((option) => ({
					...option,
					boost: usedKeys.includes(option.label) ? -10 : 10,
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

			if (queryContext.currentPair?.hasNegation) {
				options = negationQueryOperatorSuggestions;
			}

			// If we have a key context, add that info to the operator suggestions
			if (keyName) {
				// Find the key details from suggestions
				const keyDetails = (keySuggestions || []).find((k) => k.label === keyName);
				const keyType = keyDetails?.type || '';

				// Filter operators based on key type
				if (keyType) {
					if (keyType === QUERY_BUILDER_KEY_TYPES.NUMBER) {
						// Prioritize numeric operators
						options = options
							.filter((op) =>
								QUERY_BUILDER_OPERATORS_BY_KEY_TYPE[
									QUERY_BUILDER_KEY_TYPES.NUMBER
								].includes(op.label),
							)
							.map((op) => ({
								...op,
								boost: ['>', '<', '>=', '<=', '=', '!=', 'BETWEEN'].includes(op.label)
									? 100
									: 0,
							}));
					} else if (
						keyType === QUERY_BUILDER_KEY_TYPES.STRING ||
						keyType === 'keyword'
					) {
						// Prioritize string operators
						options = options
							.filter((op) =>
								QUERY_BUILDER_OPERATORS_BY_KEY_TYPE[
									QUERY_BUILDER_KEY_TYPES.STRING
								].includes(op.label),
							)
							.map((op) => {
								if (op.label === OPERATORS['=']) {
									return {
										...op,
										boost: 200,
									};
								}
								if (
									[
										OPERATORS['!='],
										OPERATORS.LIKE,
										OPERATORS.ILIKE,
										OPERATORS.CONTAINS,
										OPERATORS.IN,
									].includes(op.label)
								) {
									return {
										...op,
										boost: 100,
									};
								}
								return {
									...op,
									boost: 0,
								};
							});
					} else if (keyType === QUERY_BUILDER_KEY_TYPES.BOOLEAN) {
						// Prioritize boolean operators
						options = options
							.filter((op) =>
								QUERY_BUILDER_OPERATORS_BY_KEY_TYPE[
									QUERY_BUILDER_KEY_TYPES.BOOLEAN
								].includes(op.label),
							)
							.map((op) => {
								if (op.label === OPERATORS['=']) {
									return {
										...op,
										boost: 200,
									};
								}
								if (op.label === OPERATORS['!=']) {
									return {
										...op,
										boost: 100,
									};
								}
								return {
									...op,
									boost: 0,
								};
							});
					}
				}
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
			let searchText = '';

			if (queryContext.currentPair && queryContext.currentPair.value) {
				searchText = unquote(queryContext.currentPair.value).toLowerCase().trim();
			}

			options = (valueSuggestions || []).filter((option) =>
				option.label.toLowerCase().includes(searchText),
			);

			// Add dynamic variables suggestions for the current key
			const variableName = dynamicVariables?.find(
				(variable) => variable?.dynamicVariablesAttribute === keyName,
			)?.name;

			if (variableName) {
				const variableValue = `$${variableName}`;
				const variableOption = {
					label: variableValue,
					type: 'variable',
					apply: variableValue,
				};

				// Add variable suggestion at the beginning if it matches the search text
				if (variableValue.toLowerCase().includes(searchText.toLowerCase())) {
					options = [variableOption, ...options];
				}
			}

			// Trigger fetch only if needed
			const shouldFetch =
				// Fetch only if key is available
				keyName &&
				// Fetch if either there's no suggestion left with the current searchText or searchText is empty
				(((options.length === 0 || searchText === '') &&
					lastValueRef.current !== searchText &&
					!isFetchingCompleteValuesList) ||
					keyName !== activeKey ||
					isLoadingSuggestions) &&
				!(isLoadingSuggestions && lastKeyRef.current === keyName);

			if (shouldFetch) {
				// eslint-disable-next-line sonarjs/no-identical-functions
				debouncedFetchValueSuggestions({
					key: keyName,
					searchText,
					fetchingComplete: true,
				});
			}

			// Process options to add appropriate formatting when selected
			const processedOptions = options.map((option) => {
				// Clone the option to avoid modifying the original
				const processedOption = { ...option };

				// Skip processing for non-selectable items
				if (!option.apply || typeof option.apply === 'function') {
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
				} else if (option.type === 'number') {
					// Numbers don't get quoted but may need brackets for IN operators
					if (isListOperator(operatorName)) {
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
				} else if (option.type === 'variable') {
					// Variables should be used as-is (they already have the $ prefix)
					processedOption.apply = option.label;
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
			options = Object.values(QUERY_BUILDER_FUNCTIONS).map((option) => ({
				label: option,
				apply: `${option}()`,
				type: 'function',
			}));

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
			const currentQuery = editorRef.current?.state.doc.toString() || '';
			const curChar = currentQuery.charAt(cursorPos.ch - 1) || '';

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

		// Don't show anything if no context detected
		return {
			from: word?.from ?? 0,
			options: [],
		};
	}

	// Effect to handle focus state and trigger suggestions
	useEffect(() => {
		const clearTimeout = toggleSuggestions(10);
		return (): void => clearTimeout();
	}, [isFocused, toggleSuggestions]);

	useEffect(() => {
		if (!queryContext) return;
		// Trigger suggestions based on context
		if (editorRef.current) {
			toggleSuggestions(10);
		}

		// Handle value suggestions for value context
		if (queryContext.isInValue) {
			const { keyToken, currentToken } = queryContext;
			const key = keyToken || currentToken;

			// Only fetch if needed and if we have a valid key
			if (key && key !== activeKey && !isLoadingSuggestions) {
				fetchValueSuggestions({ key });
			}
		}
	}, [
		queryContext,
		toggleSuggestions,
		isLoadingSuggestions,
		activeKey,
		fetchValueSuggestions,
	]);

	const getTooltipContent = (): JSX.Element => (
		<div>
			Need help with search syntax?
			<br />
			<a
				href="https://signoz.io/docs/userguide/search-syntax/"
				target="_blank"
				rel="noopener noreferrer"
				style={{ color: '#1890ff', textDecoration: 'underline' }}
			>
				View documentation
			</a>
		</div>
	);

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

			<div className="query-where-clause-editor-container">
				<Tooltip title={getTooltipContent()} placement="left">
					<a
						href="https://signoz.io/docs/userguide/search-syntax/"
						target="_blank"
						rel="noopener noreferrer"
						style={{
							position: 'absolute',
							top: 8,
							right: validation.isValid === false && getCurrentQuery() ? 40 : 8, // Move left when error shown
							cursor: 'help',
							zIndex: 10,
							transition: 'right 0.2s ease',
							display: 'inline-flex',
							alignItems: 'center',
							color: '#8c8c8c',
						}}
						onClick={(e): void => e.stopPropagation()}
					>
						<Info
							size={14}
							style={{
								opacity: 0.9,
								color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500,
							}}
						/>
					</a>
				</Tooltip>

				<CodeMirror
					theme={isDarkMode ? copilot : githubLight}
					onChange={handleChange}
					onUpdate={handleUpdate}
					onCreateEditor={handleEditorCreate}
					className={cx('query-where-clause-editor', {
						isValid: validation.isValid === true,
						hasErrors: validation.errors.length > 0,
					})}
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
						Prec.highest(
							keymap.of([
								...completionKeymap,
								{
									key: 'Escape',
									run: closeCompletion,
								},
								{
									key: 'Enter',
									preventDefault: true,
									// Prevent default behavior of Enter to add new line
									// and instead run a custom action
									run: (): boolean => true,
								},
								{
									key: 'Mod-Enter',
									preventDefault: true,
									// Prevent default behavior of Mod-Enter to add new line
									// and instead run a custom action
									// Mod-Enter is usually Ctrl-Enter or Cmd-Enter based on OS
									run: (): boolean => {
										if (onRun && typeof onRun === 'function') {
											onRun(getCurrentQuery());
										} else {
											handleRunQuery();
										}
										return true;
									},
								},
								{
									key: 'Shift-Enter',
									preventDefault: true,
									// Prevent default behavior of Shift-Enter to add new line
									run: (): boolean => true,
								},
							]),
						),
					]}
					placeholder={placeholder}
					basicSetup={{
						lineNumbers: false,
					}}
					onFocus={(): void => {
						setIsFocused(true);
					}}
					onBlur={handleBlur}
				/>

				{getCurrentQuery() && validation.isValid === false && !isFocused && (
					<div
						className={cx('query-status-container', {
							hasErrors: validation.errors.length > 0,
						})}
					>
						<Popover
							placement="bottomRight"
							showArrow={false}
							content={
								<div className="query-status-content">
									<div className="query-status-content-header">
										<div className="query-validation">
											<div className="query-validation-errors">
												{validation.errors.map((error) => (
													<div key={error.message} className="query-validation-error">
														<div className="query-validation-error">
															{error.line}:{error.column} - {error.message}
														</div>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							}
							overlayClassName="query-status-popover"
						>
							{validation.isValid ? (
								<Button
									type="text"
									icon={<CheckCircleFilled />}
									className="periscope-btn ghost"
								/>
							) : (
								<Button
									type="text"
									icon={<TriangleAlert size={14} color={Color.BG_CHERRY_500} />}
									className="periscope-btn ghost"
								/>
							)}
						</Popover>
					</div>
				)}
			</div>

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
											theme={isDarkMode ? copilot : githubLight}
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

			{/* {queryContext && (
				<Card size="small" title="Current Context" className="query-context">
					<div className="context-details">
						<Space direction="vertical" size={4}>
							<Space>
								<Typography.Text strong>Token:</Typography.Text>
								<Typography.Text code>
									{queryContext.currentToken || '-'}
								</Typography.Text>
							</Space>
							<Space>
								<Typography.Text strong>Type:</Typography.Text>
								<Typography.Text>{queryContext.tokenType || '-'}</Typography.Text>
							</Space>
							<Space>
								<Typography.Text strong>Context:</Typography.Text>
								{renderContextBadge()}
							</Space>

							{queryContext.keyToken && (
								<Space>
									<Typography.Text strong>Key:</Typography.Text>
									<Typography.Text code>{queryContext.keyToken}</Typography.Text>
								</Space>
							)}

							{queryContext.operatorToken && (
								<Space>
									<Typography.Text strong>Operator:</Typography.Text>
									<Typography.Text code>{queryContext.operatorToken}</Typography.Text>
								</Space>
							)}

							{queryContext.valueToken && (
								<Space>
									<Typography.Text strong>Value:</Typography.Text>
									<Typography.Text code>{queryContext.valueToken}</Typography.Text>
								</Space>
							)}
						</Space>
					</div>
				</Card>
			)} */}
		</div>
	);
}

QuerySearch.defaultProps = {
	onRun: undefined,
	signalSource: '',
	hardcodedAttributeKeys: undefined,
	placeholder:
		"Enter your filter query (e.g., http.status_code >= 500 AND service.name = 'frontend')",
};

export default QuerySearch;
