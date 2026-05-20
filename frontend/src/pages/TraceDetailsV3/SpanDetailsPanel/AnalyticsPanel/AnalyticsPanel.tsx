import { useMemo } from 'react';
import {
	TabsContent,
	TabsList,
	TabsRoot,
	TabsTrigger,
} from '@signozhq/ui/tabs';
import cx from 'classnames';
import { DetailsHeader } from 'components/DetailsPanel';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FloatingPanel } from 'periscope/components/FloatingPanel';

import { useTraceStore } from '../../stores/traceStore';
import {
	AGGREGATIONS,
	getAggregationMap as findAggregationMap,
} from '../../utils/aggregations';

import styles from './AnalyticsPanel.module.scss';

interface AnalyticsPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

const PANEL_WIDTH = 350;
const PANEL_MARGIN_RIGHT = 100;
const PANEL_MARGIN_TOP = 50;
const PANEL_MARGIN_BOTTOM = 50;

function AnalyticsPanel({
	isOpen,
	onClose,
}: AnalyticsPanelProps): JSX.Element | null {
	const aggregations = useTraceStore((s) => s.aggregations);
	const colorByFieldName = useTraceStore((s) => s.colorByField.name);

	const execTimePct = useMemo(
		() =>
			findAggregationMap(
				aggregations,
				AGGREGATIONS.EXEC_TIME_PCT,
				colorByFieldName,
			),
		[aggregations, colorByFieldName],
	);

	const spanCounts = useMemo(
		() =>
			findAggregationMap(aggregations, AGGREGATIONS.SPAN_COUNT, colorByFieldName),
		[aggregations, colorByFieldName],
	);

	const execTimeRows = useMemo(() => {
		if (!execTimePct) {
			return [];
		}
		return Object.entries(execTimePct)
			.map(([group, percentage]) => ({
				group,
				percentage,
				color: generateColor(group, themeColors.traceDetailColorsV3),
			}))
			.sort((a, b) => b.percentage - a.percentage);
	}, [execTimePct]);

	const spanCountRows = useMemo(() => {
		if (!spanCounts) {
			return [];
		}
		const max = Math.max(...Object.values(spanCounts), 1);
		return Object.entries(spanCounts)
			.map(([group, count]) => ({
				group,
				count,
				max,
				color: generateColor(group, themeColors.traceDetailColorsV3),
			}))
			.sort((a, b) => b.count - a.count);
	}, [spanCounts]);

	if (!isOpen) {
		return null;
	}

	return (
		<FloatingPanel
			isOpen
			width={PANEL_WIDTH}
			height={window.innerHeight - PANEL_MARGIN_TOP - PANEL_MARGIN_BOTTOM}
			defaultPosition={{
				x: window.innerWidth - PANEL_WIDTH - PANEL_MARGIN_RIGHT,
				y: PANEL_MARGIN_TOP,
			}}
			enableResizing={{
				top: true,
				bottom: true,
				left: false,
				right: false,
				topLeft: false,
				topRight: false,
				bottomLeft: false,
				bottomRight: false,
			}}
		>
			<DetailsHeader
				title="Analytics"
				onClose={onClose}
				className="floating-panel__drag-handle"
			/>

			<div className={styles.body}>
				<TabsRoot defaultValue="exec-time">
					<TabsList variant="secondary">
						<TabsTrigger value="exec-time" variant="secondary">
							% exec time
						</TabsTrigger>
						<TabsTrigger value="spans" variant="secondary">
							Spans
						</TabsTrigger>
					</TabsList>

					<div className={styles.tabsScroll}>
						<TabsContent value="exec-time">
							<div className={styles.list}>
								{execTimeRows.map((row) => (
									<>
										<div
											key={`${row.group}-dot`}
											className={styles.dot}
											style={{ backgroundColor: row.color }}
										/>
										<span key={`${row.group}-name`} className={styles.serviceName}>
											{row.group}
										</span>
										<div key={`${row.group}-bar`} className={styles.barCell}>
											<div className={styles.bar}>
												<div
													className={styles.barFill}
													style={{
														width: `${Math.min(row.percentage, 100)}%`,
														backgroundColor: row.color,
													}}
												/>
											</div>
											<span className={cx(styles.value, styles.valueWide)}>
												{row.percentage.toFixed(2)}%
											</span>
										</div>
									</>
								))}
							</div>
						</TabsContent>

						<TabsContent value="spans">
							<div className={styles.list}>
								{spanCountRows.map((row) => (
									<>
										<div
											key={`${row.group}-dot`}
											className={styles.dot}
											style={{ backgroundColor: row.color }}
										/>
										<span key={`${row.group}-name`} className={styles.serviceName}>
											{row.group}
										</span>
										<div key={`${row.group}-bar`} className={styles.barCell}>
											<div className={styles.bar}>
												<div
													className={styles.barFill}
													style={{
														width: `${(row.count / row.max) * 100}%`,
														backgroundColor: row.color,
													}}
												/>
											</div>
											<span className={cx(styles.value, styles.valueNarrow)}>
												{row.count}
											</span>
										</div>
									</>
								))}
							</div>
						</TabsContent>
					</div>
				</TabsRoot>
			</div>
		</FloatingPanel>
	);
}

export default AnalyticsPanel;
