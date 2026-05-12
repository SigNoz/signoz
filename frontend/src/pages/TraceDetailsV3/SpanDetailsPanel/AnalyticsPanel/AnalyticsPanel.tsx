import { useMemo } from 'react';
import {
	TabsContent,
	TabsList,
	TabsRoot,
	TabsTrigger,
} from '@signozhq/ui/tabs';
import { DetailsHeader } from 'components/DetailsPanel';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FloatingPanel } from 'periscope/components/FloatingPanel';

import { useTraceContext } from '../../contexts/TraceContext';
import { AGGREGATIONS } from '../../utils/aggregations';

import './AnalyticsPanel.styles.scss';

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
	const { getAggregationMap } = useTraceContext();

	const execTimePct = useMemo(
		() => getAggregationMap(AGGREGATIONS.EXEC_TIME_PCT),
		[getAggregationMap],
	);

	const spanCounts = useMemo(
		() => getAggregationMap(AGGREGATIONS.SPAN_COUNT),
		[getAggregationMap],
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
			className="analytics-panel"
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

			<div className="analytics-panel__body">
				<TabsRoot defaultValue="exec-time">
					<TabsList variant="secondary">
						<TabsTrigger value="exec-time" variant="secondary">
							% exec time
						</TabsTrigger>
						<TabsTrigger value="spans" variant="secondary">
							Spans
						</TabsTrigger>
					</TabsList>

					<div className="analytics-panel__tabs-scroll">
						<TabsContent value="exec-time">
							<div className="analytics-panel__list">
								{execTimeRows.map((row) => (
									<>
										<div
											key={`${row.group}-dot`}
											className="analytics-panel__dot"
											style={{ backgroundColor: row.color }}
										/>
										<span
											key={`${row.group}-name`}
											className="analytics-panel__service-name"
										>
											{row.group}
										</span>
										<div key={`${row.group}-bar`} className="analytics-panel__bar-cell">
											<div className="analytics-panel__bar">
												<div
													className="analytics-panel__bar-fill"
													style={{
														width: `${Math.min(row.percentage, 100)}%`,
														backgroundColor: row.color,
													}}
												/>
											</div>
											<span className="analytics-panel__value analytics-panel__value--wide">
												{row.percentage.toFixed(2)}%
											</span>
										</div>
									</>
								))}
							</div>
						</TabsContent>

						<TabsContent value="spans">
							<div className="analytics-panel__list">
								{spanCountRows.map((row) => (
									<>
										<div
											key={`${row.group}-dot`}
											className="analytics-panel__dot"
											style={{ backgroundColor: row.color }}
										/>
										<span
											key={`${row.group}-name`}
											className="analytics-panel__service-name"
										>
											{row.group}
										</span>
										<div key={`${row.group}-bar`} className="analytics-panel__bar-cell">
											<div className="analytics-panel__bar">
												<div
													className="analytics-panel__bar-fill"
													style={{
														width: `${(row.count / row.max) * 100}%`,
														backgroundColor: row.color,
													}}
												/>
											</div>
											<span className="analytics-panel__value analytics-panel__value--narrow">
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
