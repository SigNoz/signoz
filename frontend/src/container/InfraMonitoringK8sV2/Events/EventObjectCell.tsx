import { K8sEventRow } from './types';
import { getEventDrillDownTarget } from './utils';

import styles from './K8sEventsList.module.scss';

interface EventObjectCellProps {
	record: K8sEventRow;
	onDrillDown: (record: K8sEventRow) => void;
}

/**
 * Kinds without a details drawer — and Pod events missing `k8s.object.uid` —
 * render as plain text rather than a dead link.
 */
function EventObjectCell({
	record,
	onDrillDown,
}: EventObjectCellProps): JSX.Element {
	if (!getEventDrillDownTarget(record)) {
		return <span>{record.objectName || '—'}</span>;
	}

	return (
		<button
			type="button"
			className={styles.objectLink}
			onClick={(): void => onDrillDown(record)}
			data-testid={`k8s-events-object-${record.id}`}
		>
			{record.objectName}
		</button>
	);
}

export default EventObjectCell;
