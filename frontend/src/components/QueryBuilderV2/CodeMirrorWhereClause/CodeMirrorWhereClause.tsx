/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-nested-ternary */

import './CodeMirrorWhereClause.styles.scss';

import {
	CheckCircleFilled,
	CloseCircleFilled,
	InfoCircleOutlined,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import {
	autocompletion,
	CompletionContext,
	CompletionResult,
} from '@codemirror/autocomplete';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { Badge, Card, Divider, Space, Tooltip, Typography } from 'antd';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
// import { useGetQueryKeyValueSuggestions } from 'hooks/querySuggestions/useGetQueryKeyValueSuggestions';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IQueryContext, IValidationResult } from 'types/antlrQueryTypes';
import { QueryKeySuggestionsProps } from 'types/api/querySuggestions/types';
import { getQueryContextAtCursor, validateQuery } from 'utils/antlrQueryUtils';

const { Text, Title } = Typography;

function CodeMirrorWhereClause(): JSX.Element {
	const [query, setQuery] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
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

	const {
		data: queryKeySuggestions,
		// isLoading: queryKeySuggestionsLoading,
		// isRefetching: queryKeySuggestionsRefetching,
		// refetch: queryKeySuggestionsRefetch,
		// error: queryKeySuggestionsError,
		// isError: queryKeySuggestionsIsError,
	} = useGetQueryKeySuggestions({ signal: 'traces' });

	// const {
	// 	data: queryKeyValuesSuggestions,
	// 	isLoading: queryKeyValuesSuggestionsLoading,
	// 	refetch: refetchQueryKeyValuesSuggestions,
	// } = useGetQueryKeyValueSuggestions({
	// 	signal: 'traces',
	// 	key: 'status',
	// });

	const generateOptions = (data: any): any[] => {
		const options = Object.values(data.keys).flatMap((items: any) =>
			items.map(({ name, fieldDataType, fieldContext }: any) => ({
				label: name,
				type: fieldDataType === 'string' ? 'keyword' : fieldDataType,
				info: fieldContext,
				details: '',
			})),
		);

		console.log('options', options);

		return options;
	};

	useEffect(() => {
		if (queryKeySuggestions) {
			console.log('queryKeySuggestions', queryKeySuggestions);

			const options = generateOptions(queryKeySuggestions.data.data);

			setKeySuggestions(options);
		}
	}, [queryKeySuggestions]);

	console.log('keySuggestions', keySuggestions);

	const handleUpdate = (viewUpdate: { view: EditorView }): void => {
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

	console.log({
		cursorPos,
		queryContext,
		validation,
		isLoading,
	});

	const handleQueryChange = useCallback(async (newQuery: string) => {
		setIsLoading(true);
		setQuery(newQuery);

		try {
			const validationResponse = validateQuery(newQuery);
			setValidation(validationResponse);
		} catch (error) {
			setValidation({
				isValid: false,
				message: 'Failed to process query',
				errors: [error instanceof Error ? error.message : 'Unknown error'],
			});
		} finally {
			setIsLoading(false);
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
		} else if (queryContext.isInParenthesis) {
			color = 'grey';
			text = 'Parenthesis';
		}

		return (
			<Badge
				color={color}
				text={text}
				style={{
					color: 'black',
				}}
			/>
		);
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
		} else if (queryContext.isInOperator) {
			options = [
				{ label: '=', type: 'operator', info: 'Equal to' },
				{ label: '!=', type: 'operator', info: 'Not equal to' },
				{ label: '>', type: 'operator', info: 'Greater than' },
				{ label: '<', type: 'operator', info: 'Less than' },
				{ label: '>=', type: 'operator', info: 'Greater than or equal to' },
				{ label: '<=', type: 'operator', info: 'Less than or equal to' },
				{ label: 'LIKE', type: 'operator', info: 'Like' },
				{ label: 'ILIKE', type: 'operator', info: 'Case insensitive like' },
				{ label: 'BETWEEN', type: 'operator', info: 'Between' },
				{ label: 'EXISTS', type: 'operator', info: 'Exists' },
				{ label: 'REGEXP', type: 'operator', info: 'Regular expression' },
				{ label: 'CONTAINS', type: 'operator', info: 'Contains' },
				{ label: 'IN', type: 'operator', info: 'In' },
				{ label: 'NOT', type: 'operator', info: 'Not' },
				// Add more operator options here
			];
		} else if (queryContext.isInValue) {
			// refetchQueryKeyValuesSuggestions();

			// Fetch values based on the key
			const key = queryContext.currentToken;
			// refetchQueryKeyValuesSuggestions({ key }).then((response) => {
			// 	if (response && response.data && Array.isArray(response.data.values)) {
			// 		options = response.data.values.map((value: string) => ({
			// 			label: value,
			// 			type: 'value',
			// 		}));
			// 	}
			// });

			console.log('key', key, queryContext, query);

			options = [
				{ label: 'error', type: 'value' },
				{ label: 'frontend', type: 'value' },
				// Add more value options here
			];
		} else if (queryContext.isInFunction) {
			options = [
				{ label: 'HAS', type: 'function' },
				{ label: 'HASANY', type: 'function' },
				// Add more function options here
			];
		} else if (queryContext.isInConjunction) {
			options = [
				{ label: 'AND', type: 'conjunction' },
				{ label: 'OR', type: 'conjunction' },
			];
		} else if (queryContext.isInParenthesis) {
			options = [
				{ label: '(', type: 'parenthesis' },
				{ label: ')', type: 'parenthesis' },
			];
		}

		return {
			from: word?.from ?? 0,
			options,
		};
	}

	return (
		<div className="code-mirror-where-clause">
			<Card
				size="small"
				title={<Title level={5}>Where Clause</Title>}
				extra={
					<Tooltip title="Write a query to filter your data">
						<QuestionCircleOutlined />
					</Tooltip>
				}
			>
				<CodeMirror
					value={query}
					theme="dark"
					onChange={handleChange}
					onUpdate={handleUpdate}
					autoFocus
					placeholder="Enter your query (e.g., status = 'error' AND service = 'frontend')"
					extensions={[autocompletion({ override: [myCompletions] })]}
				/>

				<Space className="cursor-position" size={4}>
					<InfoCircleOutlined />
					<Text style={{ color: 'black' }}>
						Line: {cursorPos.line}, Position: {cursorPos.ch}
					</Text>
				</Space>

				<Divider style={{ margin: '8px 0' }} />

				<div className="query-validation">
					<Text>Status:</Text>
					<div className={validation.isValid ? 'valid' : 'invalid'}>
						{validation.isValid ? (
							<>
								<CheckCircleFilled /> Valid
							</>
						) : (
							<>
								<CloseCircleFilled /> Invalid
							</>
						)}
					</div>
					{validation.message && (
						<Tooltip title={validation.message}>
							<InfoCircleOutlined style={{ marginLeft: 8 }} />
						</Tooltip>
					)}
				</div>
			</Card>

			{queryContext && (
				<Card size="small" title="Current Context" className="query-context">
					<div className="context-details">
						<Space direction="vertical" size={4}>
							<Space>
								<Text strong style={{ color: 'black' }}>
									Token:
								</Text>
								<Text code style={{ color: 'black' }}>
									{queryContext.currentToken || '-'}
								</Text>
							</Space>
							<Space>
								<Text strong style={{ color: 'black' }}>
									Type:
								</Text>
								<Text style={{ color: 'black' }}>{queryContext.tokenType || '-'}</Text>
							</Space>
							<Space>
								<Text strong style={{ color: 'black' }}>
									Context:
								</Text>
								{renderContextBadge()}
							</Space>
						</Space>
					</div>
				</Card>
			)}

			<Card
				size="small"
				title="Query Examples"
				className="query-examples"
				style={{
					backgroundColor: 'var(--bg-vanilla-100)',
					color: 'black',
				}}
			>
				<div className="query-examples-list">Query Examples</div>
				<ul>
					<li>
						<Text code style={{ color: 'black' }}>
							status = &apos;error&apos;
						</Text>
					</li>
					<li>
						<Text code style={{ color: 'black' }}>
							service = &apos;frontend&apos; AND level = &apos;error&apos;
						</Text>
					</li>
					<li>
						<Text code style={{ color: 'black' }}>
							message LIKE &apos;%timeout%&apos;
						</Text>
					</li>
					<li>
						<Text code style={{ color: 'black' }}>
							duration {'>'} 1000
						</Text>
					</li>
					<li>
						<Text code style={{ color: 'black' }}>
							tags IN [&apos;prod&apos;, &apos;frontend&apos;]
						</Text>
					</li>
					<li>
						<Text code style={{ color: 'black' }}>
							NOT (status = &apos;error&apos; OR level = &apos;error&apos;)
						</Text>
					</li>
				</ul>
			</Card>
		</div>
	);
}

export default CodeMirrorWhereClause;
