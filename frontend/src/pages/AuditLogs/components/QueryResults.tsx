import { Typography } from '@signozhq/ui/typography';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import APIError from 'types/api/error';
import { ILog } from 'types/api/logs/log';

import styles from './QueryResults.module.scss';

interface QueryResultsProps {
	logs: ILog[];
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: Error | null;
}

export function QueryResults({
	logs,
	isLoading,
	isFetching,
	isError,
	error,
}: QueryResultsProps): JSX.Element {
	if (isLoading || (isFetching && logs.length === 0)) {
		return <LogsLoading />;
	}

	if (isError && error) {
		return <ErrorInPlace error={error as APIError} />;
	}

	if (logs.length === 0) {
		return (
			<div className={styles.empty} data-testid="audit-logs-empty">
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="secondary"
					as="p"
					align="center"
					textOverflow="wrap"
				>
					No audit logs found for this query.
				</Typography>
			</div>
		);
	}

	return (
		<div className={styles.results} data-testid="audit-logs-results">
			<pre>{JSON.stringify(logs, null, 2)}</pre>
		</div>
	);
}
