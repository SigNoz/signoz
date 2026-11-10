import { AppLink } from 'lib/router/AppLink';

import styles from './LogHighlights.module.scss';

interface TraceIdFieldProps {
	traceId: string;
}

function TraceIdField({ traceId }: TraceIdFieldProps): JSX.Element {
	return (
		<AppLink
			to={{ pathname: `/trace/${traceId}` }}
			target="_blank"
			rel="noreferrer"
			className={styles.traceLink}
			title={traceId}
		>
			{traceId}
		</AppLink>
	);
}

export default TraceIdField;
