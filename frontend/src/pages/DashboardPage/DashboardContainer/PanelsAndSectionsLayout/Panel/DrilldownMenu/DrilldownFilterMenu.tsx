import { PANEL_TYPES } from 'constants/queryBuilder';
import { getGroupContextMenuConfig } from 'container/QueryTable/Drilldown/contextConfig';
import type { ClickedData } from 'periscope/components/ContextMenu';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

interface DrilldownFilterMenuProps {
	/** The panel's V5→V1 query the operator menu builds filters against. */
	v1Query: Query;
	/** The clicked group column's key. */
	clickedKey: string;
	/** Apply the chosen operator (adds the filter and opens the View modal). */
	onFilter: (operator: string) => void;
}

/**
 * The group-column "filter by value" submenu — the operator list from V1's read-only
 * `getGroupContextMenuConfig`, wired to `onFilter`.
 */
function DrilldownFilterMenu({
	v1Query,
	clickedKey,
	onFilter,
}: DrilldownFilterMenuProps): JSX.Element {
	const clickedData: ClickedData = {
		column: { dataIndex: clickedKey },
		record: { key: clickedKey, timestamp: 0 },
	};
	return (
		<>
			{getGroupContextMenuConfig({
				query: v1Query,
				clickedData,
				panelType: PANEL_TYPES.TABLE,
				onColumnClick: onFilter,
			}).items ?? null}
		</>
	);
}

export default DrilldownFilterMenu;
