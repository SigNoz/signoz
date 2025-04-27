/* eslint-disable no-nested-ternary */

import './CodeMirrorWhereClause.styles.scss';

import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IQueryContext, IValidationResult } from 'types/antlrQueryTypes';
import { getQueryContextAtCursor, validateQuery } from 'utils/antlrQueryUtils';

const { Text } = Typography;

function CodeMirrorWhereClause(): JSX.Element {
	const [query, setQuery] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [queryContext, setQueryContext] = useState<IQueryContext | null>(null);
	const [validation, setValidation] = useState<IValidationResult>({
		isValid: false,
		message: '',
		errors: [],
	});

	const [cursorPos, setCursorPos] = useState({ line: 0, ch: 0 });
	const lastPosRef = useRef<{ line: number; ch: number }>({ line: 0, ch: 0 });

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

	useEffect(() => {
		console.log('cursorPos', cursorPos);
	}, [cursorPos]);

	const handleChange = (value: string): void => {
		console.log('value', value);
		setQuery(value);
		handleQueryChange(value);
	};

	return (
		<div className="code-mirror-where-clause">
			<CodeMirror
				value={query}
				onChange={handleChange}
				onUpdate={handleUpdate}
				placeholder="Enter your query (e.g., status = 'error' AND service = 'frontend')"
			/>

			<div className="cursor-position">
				Cursor at Line: {cursorPos.line}, Ch: {cursorPos.ch}
			</div>

			{queryContext && (
				<div className="query-context">
					<h3>Current Context</h3>
					<div className="context-details">
						<p>
							<strong>Token:</strong> {queryContext.currentToken}
						</p>
						<p>
							<strong>Type:</strong> {queryContext.tokenType}
						</p>
						<p>
							<strong>Context:</strong>{' '}
							{queryContext.isInValue
								? 'Value'
								: queryContext.isInKey
								? 'Key'
								: queryContext.isInOperator
								? 'Operator'
								: queryContext.isInFunction
								? 'Function'
								: 'Unknown'}
						</p>
					</div>
				</div>
			)}

			<div className="query-examples">
				<Text type="secondary">Examples:</Text>
				<ul>
					<li>
						<Text code>status = &apos;error&apos;</Text>
					</li>
					<li>
						<Text code>
							service = &apos;frontend&apos; AND level = &apos;error&apos;
						</Text>
					</li>
					<li>
						<Text code>message LIKE &apos;%timeout%&apos;</Text>
					</li>
					<li>
						<Text code>duration {'>'} 1000</Text>
					</li>
					<li>
						<Text code>tags IN [&apos;prod&apos;, &apos;frontend&apos;]</Text>
					</li>
					<li>
						<Text code>
							NOT (status = &apos;error&apos; OR level = &apos;error&apos;)
						</Text>
					</li>
				</ul>
			</div>
		</div>
	);
}

export default CodeMirrorWhereClause;
