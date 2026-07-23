import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import Editor from 'components/Editor';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import type { PayloadVariables } from 'types/api/dashboard/variables/query';

import styles from './VariableForm.module.scss';

interface QueryVariableFieldsProps {
	queryValue: string;
	/** Sibling variable selections, so dependent `$vars` in the query resolve. */
	variables: PayloadVariables;
	onChange: (queryValue: string) => void;
	onPreview: (values: (string | number)[]) => void;
	onError: (message: string | null) => void;
}

/** Query-variable body: SQL editor + "Test Run Query" that previews the values. */
function QueryVariableFields({
	queryValue,
	variables,
	onChange,
	onPreview,
	onError,
}: QueryVariableFieldsProps): JSX.Element {
	const [isRunning, setIsRunning] = useState(false);

	const runTest = async (): Promise<void> => {
		setIsRunning(true);
		onError(null);
		let success = false;
		try {
			const res = await dashboardVariablesQuery({ query: queryValue, variables });
			if (res.statusCode === 200 && res.payload) {
				onPreview(res.payload.variableValues ?? []);
				success = true;
			} else {
				onError(res.error || 'Failed to run query');
				onPreview([]);
			}
		} catch (err) {
			// `dashboardVariablesQuery` throws `{ message, details: { error } }`.
			const detail = (err as { details?: { error?: string } }).details?.error;
			const message =
				detail && detail.includes('Syntax error:')
					? 'Please make sure query is valid and dependent variables are selected'
					: detail || (err as Error).message || 'Failed to run query';
			onError(message);
			onPreview([]);
		} finally {
			setIsRunning(false);
			void logEvent(DashboardDetailEvents.VariableQueryTested, {
				variableType: 'query',
				success,
			});
		}
	};

	return (
		<div className={styles.queryContainer}>
			<div className={styles.labelContainer}>
				<Typography.Text className={styles.label}>Query</Typography.Text>
			</div>
			<div className={styles.editorWrap}>
				<Editor
					language="sql"
					value={queryValue}
					onChange={(value): void => onChange(value)}
					height="240px"
					options={{
						fontSize: 13,
						wordWrap: 'on',
						lineNumbers: 'off',
						glyphMargin: false,
						folding: false,
						lineDecorationsWidth: 0,
						lineNumbersMinChars: 0,
						minimap: { enabled: false },
					}}
				/>
			</div>
			<div className={styles.testRow}>
				<Button
					variant="solid"
					color="primary"
					size="sm"
					loading={isRunning}
					disabled={!queryValue}
					onClick={runTest}
					testId="variable-test-run"
				>
					Test Run Query
				</Button>
			</div>
		</div>
	);
}

export default QueryVariableFields;
