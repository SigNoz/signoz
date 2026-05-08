import { useMemo } from 'react';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@signozhq/ui';
import { DetailsHeader } from 'components/DetailsPanel';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FloatingPanel } from 'periscope/components/FloatingPanel';

import './AnalyticsPanel.styles.scss';

interface AnalyticsPanelProps {
	isOpen: boolean;
	onClose: () => void;
	serviceExecTime?: Record<string, number>;
	traceStartTime?: number;
	traceEndTime?: number;
	// TODO: Re-enable when backend provides per-service span counts
	// spans?: Span[];
}

const PANEL_WIDTH = 350;
const PANEL_MARGIN_RIGHT = 100;
const PANEL_MARGIN_TOP = 50;
const PANEL_MARGIN_BOTTOM = 50;

function AnalyticsPanel({
	isOpen,
	onClose,
	serviceExecTime = {},
	traceStartTime = 0,
	traceEndTime = 0,
}: AnalyticsPanelProps): JSX.Element | null {
	const spread = traceEndTime - traceStartTime;

	const execTimeRows = useMemo(() => {
		if (spread <= 0) {
			return [];
		}
		return Object.entries(serviceExecTime)
			.map(([service, duration]) => ({
				service,
				percentage: (duration * 100) / spread,
				color: generateColor(service, themeColors.traceDetailColorsV3),
			}))
			.sort((a, b) => b.percentage - a.percentage);
	}, [serviceExecTime, spread]);

	// const spanCountRows = useMemo(() => {
	// 	const counts: Record<string, number> = {};
	// 	for (const span of spans) {
	// 		const name = span.serviceName || 'unknown';
	// 		counts[name] = (counts[name] || 0) + 1;
	// 	}
	// 	return Object.entries(counts)
	// 		.map(([service, count]) => ({
	// 			service,
	// 			count,
	// 			color: generateColor(service, themeColors.traceDetailColorsV3),
	// 		}))
	// 		.sort((a, b) => b.count - a.count);
	// }, [spans]);

	// const maxSpanCount = spanCountRows[0]?.count || 1;

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
						{/* TODO: Enable when backend provides per-service span counts
						<TabsTrigger value="spans" variant="secondary">
							Spans
						</TabsTrigger>
						*/}
					</TabsList>

					<div className="analytics-panel__tabs-scroll">
						<TabsContent value="exec-time">
							<div className="analytics-panel__list">
								{execTimeRows.map((row) => (
									<>
										<div
											key={`${row.service}-dot`}
											className="analytics-panel__dot"
											style={{ backgroundColor: row.color }}
										/>
										<span
											key={`${row.service}-name`}
											className="analytics-panel__service-name"
										>
											{row.service}
										</span>
										<div key={`${row.service}-bar`} className="analytics-panel__bar-cell">
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

						{/* TODO: Enable when backend provides per-service span counts
						<TabsContent value="spans">
							<div className="analytics-panel__list">
								{spanCountRows.map((row) => (
									<>
										<div
											key={`${row.service}-dot`}
											className="analytics-panel__dot"
											style={{ backgroundColor: row.color }}
										/>
										<span
											key={`${row.service}-name`}
											className="analytics-panel__service-name"
										>
											{row.service}
										</span>
										<div key={`${row.service}-bar`} className="analytics-panel__bar-cell">
											<div className="analytics-panel__bar">
												<div
													className="analytics-panel__bar-fill"
													style={{
														width: `${(row.count / maxSpanCount) * 100}%`,
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
						*/}
					</div>
				</TabsRoot>
			</div>
		</FloatingPanel>
	);
}

export default AnalyticsPanel;
