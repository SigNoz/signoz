/* eslint-disable no-nested-ternary */
import './WhereClause.styles.scss';

import { Input, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { IQueryContext, IValidationResult } from 'types/antlrQueryTypes';
import { getQueryContextAtCursor, validateQuery } from 'utils/antlrQueryUtils';

const { Text } = Typography;

function QueryWhereClause(): JSX.Element {
	const [query, setQuery] = useState<string>('');
	const [cursorPosition, setCursorPosition] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [queryContext, setQueryContext] = useState<IQueryContext | null>(null);
	const [validation, setValidation] = useState<IValidationResult>({
		isValid: false,
		message: '',
		errors: [],
	});

	console.log({
		cursorPosition,
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
			const context = getQueryContextAtCursor(query, cursorPosition);
			setQueryContext(context as IQueryContext);
		}
	}, [query, cursorPosition]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const { value, selectionStart } = e.target;
		setQuery(value);
		setCursorPosition(selectionStart || 0);
		handleQueryChange(value);
	};

	const handleCursorMove = (e: React.SyntheticEvent<HTMLInputElement>): void => {
		const { selectionStart } = e.currentTarget;
		setCursorPosition(selectionStart || 0);
	};

	return (
		<div className="where-clause">
			<div className="where-clause-header">
				<Text strong>Where</Text>
			</div>
			<div className="where-clause-content">
				<Input
					value={query}
					onChange={handleChange}
					onSelect={handleCursorMove}
					onKeyUp={handleCursorMove}
					placeholder="Enter your query (e.g., status = 'error' AND service = 'frontend')"
				/>

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
		</div>
	);
}

export default QueryWhereClause;
