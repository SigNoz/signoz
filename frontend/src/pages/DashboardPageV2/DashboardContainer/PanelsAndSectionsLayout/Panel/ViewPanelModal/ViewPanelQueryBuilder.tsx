import { type KeyboardEvent, useCallback } from 'react';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { PANEL_TYPES } from 'constants/queryBuilder';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';

import styles from './ViewPanelModal.module.scss';

interface ViewPanelQueryBuilderProps {
	panelType: PANEL_TYPES;
	/** Preview fetch in flight — drives the Run/Cancel button state. */
	isLoadingQueries: boolean;
	/** Run the current query (Run Query button / ⌘↵). */
	onStageRunQuery: () => void;
	/** Abort the in-flight preview fetch. */
	onCancelQuery: () => void;
}

/**
 * Drilldown query editor for the View modal. Mirrors V1's FullView: the query builder
 * rows + a "Run Query" button, with NO query-type tabs (ClickHouse/PromQL) — drilldown
 * is query-builder only, exactly as V1.
 */
function ViewPanelQueryBuilder({
	panelType,
	isLoadingQueries,
	onStageRunQuery,
	onCancelQuery,
}: ViewPanelQueryBuilderProps): JSX.Element {
	const handleKeyDownCapture = useCallback(
		(event: KeyboardEvent<HTMLDivElement>): void => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				onStageRunQuery();
			}
		},
		[onStageRunQuery],
	);

	return (
		<div
			className={styles.queryBuilder}
			data-testid="view-panel-query-builder"
			onKeyDownCapture={handleKeyDownCapture}
			role="presentation"
		>
			<QueryBuilderV2
				panelType={panelType}
				version="v3"
				isListViewPanel={panelType === PANEL_TYPES.LIST}
				signalSourceChangeEnabled
			/>
			<div className={styles.queryBuilderToolbar}>
				<RightToolbarActions
					handleCancelQuery={onCancelQuery}
					onStageRunQuery={onStageRunQuery}
					isLoadingQueries={isLoadingQueries}
				/>
			</div>
		</div>
	);
}

export default ViewPanelQueryBuilder;
