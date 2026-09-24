import { Link } from 'react-router-dom';

import styles from './LogHighlights.module.scss';

interface TraceIdFieldProps {
	traceId: string;
}

function TraceIdField({ traceId }: TraceIdFieldProps): JSX.Element {
	return (
		<Link
			to={{ pathname: `/trace/${traceId}` }}
			target="_blank"
			rel="noreferrer"
			className={styles.traceLink}
			title={traceId}
		>
			{traceId}
		</Link>
	);
}

export default TraceIdField;
