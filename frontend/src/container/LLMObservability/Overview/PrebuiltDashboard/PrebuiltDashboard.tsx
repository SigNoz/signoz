import { useCallback } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { UpdateTimeInterval } from 'store/actions';

import {
	aiObservabilityLayout,
	aiObservabilityWidgets,
} from '../dashboard/aiObservabilityDashboard';
import styles from './PrebuiltDashboard.module.scss';

// Row height (px) per layout unit, so a panel roughly keeps its authored proportions
// in the plain CSS grid (mirrors the Cost Meter breakdown's fixed-height cards).
const ROW_HEIGHT = 68;

const layoutById = new Map(aiObservabilityLayout.map((item) => [item.i, item]));

/**
 * Renders the prebuilt AI Observability dashboard read-only inside the LLM
 * Observability Overview tab, following the Cost Meter breakdown pattern: each widget
 * runs its own v5 query via `GridCard`, laid out in a 12-column CSS grid. The
 * date-time picker writes Redux `globalTime`, which each `GridCard` reads.
 */
function PrebuiltDashboard(): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const history = useHistory();
	const { pathname } = useLocation();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();

	// Drag-select on any panel narrows the shared time range (same as Cost Meter).
	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			history.push(`${pathname}?${urlQuery.toString()}`);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, history, pathname, urlQuery],
	);

	return (
		<div
			className={styles.prebuiltDashboard}
			data-testid="llm-overview-dashboard"
		>
			<div className={styles.toolbar}>
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			<div className={styles.grid}>
				{aiObservabilityWidgets.map((widget) => {
					const layout = layoutById.get(widget.id);
					return (
						<Card
							key={widget.id}
							isDarkMode={isDarkMode}
							$panelType={widget.panelTypes}
							className={styles.card}
							style={{
								gridColumn: `span ${layout?.w ?? 6}`,
								minHeight: (layout?.h ?? 4) * ROW_HEIGHT,
							}}
						>
							<GridCard
								widget={widget}
								onDragSelect={onDragSelect}
								version={ENTITY_VERSION_V5}
							/>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

export default PrebuiltDashboard;
