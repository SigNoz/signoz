import { CalendarClock, Plus } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { PLANNED_MAINTENANCE_CREATE_CHECKS } from 'hooks/plannedDowntime/usePlannedMaintenanceCollectionPermissions';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';

import styles from './PlannedDowntime.module.scss';

const DOCS_URL =
	'https://signoz.io/docs/alerts-management/planned-maintenance/';

interface PlannedDowntimeEmptyStateProps {
	onCreate: () => void;
}

function PlannedDowntimeEmptyState({
	onCreate,
}: PlannedDowntimeEmptyStateProps): JSX.Element {
	return (
		<div className={styles.emptyState} data-testid="planned-downtime-empty-state">
			<CalendarClock className={styles.emptyIcon} size={16} />
			<Typography.Text className={styles.emptyTitle}>
				No planned downtime yet
			</Typography.Text>
			<Typography.Text className={styles.emptySubtitle}>
				A planned downtime silences alert rules for a window you schedule, once or
				on repeat, so maintenance does not page anyone.
			</Typography.Text>
			<AuthZButton
				checks={PLANNED_MAINTENANCE_CREATE_CHECKS}
				variant="solid"
				color="primary"
				size="md"
				prefix={<Plus size={14} />}
				onClick={onCreate}
				testId="planned-downtime-empty-create"
			>
				New downtime
			</AuthZButton>
			<a
				className={styles.docsLink}
				href={DOCS_URL}
				target="_blank"
				rel="noopener noreferrer"
			>
				Read the planned downtime guide
			</a>
		</div>
	);
}

export default PlannedDowntimeEmptyState;
