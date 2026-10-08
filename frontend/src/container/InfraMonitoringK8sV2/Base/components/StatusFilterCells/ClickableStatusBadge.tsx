import { Badge, BadgeColor } from '@signozhq/ui/badge';
import TanStackTable from 'components/TanStackTableView';

import { StatusFilterKind, useStatusFilter } from './useStatusFilter';

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
	const { selected, setStatusFilter } = useStatusFilter(kind);

	// Clicking the status the list is already narrowed to has nothing left to
	// narrow, so it undoes the filter instead — but only when this status is the
	// whole filter, else it would silently drop the other selected statuses.
	const isWholeFilter = selected.length === 1 && selected[0] === status;

	return (
		<TanStackTable.HoverTooltip
			rowId={rowId}
			title={isWholeFilter ? `Clear ${label} filter` : `Filter by ${label}`}
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
					setStatusFilter(isWholeFilter ? [] : [status]);
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
