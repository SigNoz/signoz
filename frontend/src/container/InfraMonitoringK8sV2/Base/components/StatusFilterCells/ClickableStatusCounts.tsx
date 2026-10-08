import {
	GroupedStatusCounts,
	StatusCountItem,
} from 'container/InfraMonitoringK8sV2/components';

import { StatusFilterKind, useSetStatusFilter } from './useSetStatusFilter';

interface ClickableStatusCountsProps {
	items: StatusCountItem[];
	rowId: string;
	kind: StatusFilterKind;
	showZeroValues?: boolean;
}

function ClickableStatusCounts({
	items,
	rowId,
	kind,
	showZeroValues,
}: ClickableStatusCountsProps): JSX.Element {
	const setStatusFilter = useSetStatusFilter(kind);

	return (
		<GroupedStatusCounts
			items={items}
			rowId={rowId}
			showZeroValues={showZeroValues}
			onSelectStatuses={setStatusFilter}
		/>
	);
}

export default ClickableStatusCounts;
