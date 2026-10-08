import { Badge, BadgeColor } from '@signozhq/ui/badge';
import TanStackTable from 'components/TanStackTableView';

import { StatusFilterKind, useSetStatusFilter } from './useSetStatusFilter';

import styles from './ClickableStatusBadge.module.scss';

interface ClickableStatusBadgeProps {
	color: BadgeColor;
	label: string;
	/** The status this badge stands for, applied as the filter when clicked. */
	status: string;
	kind: StatusFilterKind;
	rowId: string;
}

function ClickableStatusBadge({
	color,
	label,
	status,
	kind,
	rowId,
}: ClickableStatusBadgeProps): JSX.Element {
	const setStatusFilter = useSetStatusFilter(kind);

	return (
		<TanStackTable.HoverTooltip
			rowId={rowId}
			title={`Filter by ${label}`}
			arrow
			align="start"
			delayDuration={300}
		>
			<button
				type="button"
				className={styles.statusBadgeButton}
				data-testid={`status-badge-${status}`}
				onClick={(e): void => {
					e.preventDefault();
					e.stopPropagation();
					setStatusFilter([status]);
				}}
			>
				<Badge color={color} variant="outline">
					{label}
				</Badge>
			</button>
		</TanStackTable.HoverTooltip>
	);
}

export default ClickableStatusBadge;
