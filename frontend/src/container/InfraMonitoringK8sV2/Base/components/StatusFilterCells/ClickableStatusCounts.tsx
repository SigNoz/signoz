import type { StatusCountItem } from 'container/InfraMonitoringK8sV2/components';
import { GroupedStatusCounts } from 'container/InfraMonitoringK8sV2/components';

import type { StatusFilterKind } from './useStatusFilter';
import { useStatusFilter } from './useStatusFilter';

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
	const { setStatusFilter } = useStatusFilter(kind);

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
