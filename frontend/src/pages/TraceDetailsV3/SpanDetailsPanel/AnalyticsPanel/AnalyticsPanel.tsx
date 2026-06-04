import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
	TabsContent,
	TabsList,
	TabsRoot,
	TabsTrigger,
} from '@signozhq/ui/tabs';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { DetailsHeader } from 'components/DetailsPanel';
import Spinner from 'components/Spinner';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useGetTraceAggregations from 'hooks/trace/useGetTraceAggregations';
import { generateColorPair } from 'pages/TraceDetailsV3/utils/generateColorPair';
import { FloatingPanel } from 'periscope/components/FloatingPanel';
import {
	SpantypesSpanAggregationDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import { useTraceStore } from '../../stores/traceStore';
import {
	AGGREGATIONS,
	getAggregationMap as findAggregationMap,
} from '../../utils/aggregations';

import styles from './AnalyticsPanel.module.scss';

interface AnalyticsPanelProps {
	isOpen: boolean;
	onClose: () => void;
	onTabChange: (tab: string) => void;
}

const PANEL_WIDTH = 350;
const PANEL_MARGIN_RIGHT = 100;
const PANEL_MARGIN_TOP = 50;
const PANEL_MARGIN_BOTTOM = 50;

function AnalyticsPanel({
	isOpen,
	onClose,
	onTabChange,
}: AnalyticsPanelProps): JSX.Element | null {
	const { id: traceId } = useParams<TraceDetailV3URLProps>();
	const colorByField = useTraceStore((s) => s.colorByField);
	const colorByFieldName = colorByField.name;
	const isDarkMode = useIsDarkMode();

	// Fetch exec-time % + span count for the current color-by field only, and
	// only while the panel is open. Changing the field refetches via the key.
	const aggregationsRequest = useMemo<SpantypesSpanAggregationDTO[]>(() => {
		// v5 TelemetryFieldKey and the generated DTO are runtime-identical; only
		// the literal-union vs enum nominal types differ
		const field = colorByField as unknown as TelemetrytypesTelemetryFieldKeyDTO;
		return [
			{ field, aggregation: AGGREGATIONS.EXEC_TIME_PCT },
			{ field, aggregation: AGGREGATIONS.SPAN_COUNT },
		];
	}, [colorByField]);

	const { data, isLoading, isError } = useGetTraceAggregations({
		traceId: traceId || '',
		aggregations: aggregationsRequest,
		enabled: isOpen,
	});

	const aggregations = data?.data;

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
			.map(([group, percentage]) => {
				const pair = generateColorPair(group);
				return {
					group,
					percentage,
					color: isDarkMode ? pair.color : pair.colorDark,
				};
			})
			.sort((a, b) => b.percentage - a.percentage);
	}, [execTimePct, isDarkMode]);

	const spanCountRows = useMemo(() => {
		if (!spanCounts) {
			return [];
		}
		const max = Math.max(...Object.values(spanCounts), 1);
		return Object.entries(spanCounts)
			.map(([group, count]) => {
				const pair = generateColorPair(group);
				return {
					group,
					count,
					max,
					color: isDarkMode ? pair.color : pair.colorDark,
				};
			})
			.sort((a, b) => b.count - a.count);
	}, [spanCounts, isDarkMode]);

	if (!isOpen) {
		return null;
	}

	// Loading / error / empty render inside the tab content so the tabs stay
	// visible. Returns null when there are rows to show.
	const renderState = (rowCount: number): JSX.Element | null => {
		if (isLoading) {
			return (
				<div className={styles.state}>
					<Spinner height="auto" />
				</div>
			);
		}
		if (isError) {
			return (
				<div className={styles.state}>
					<Typography.Text>Couldn&apos;t load analytics</Typography.Text>
				</div>
			);
		}
		if (rowCount === 0) {
			return (
				<div className={styles.state}>
					<Typography.Text>No data for {colorByFieldName}</Typography.Text>
				</div>
			);
		}
		return null;
	};

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
				<TabsRoot defaultValue="exec-time" onValueChange={onTabChange}>
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
							{renderState(execTimeRows.length) ?? (
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
							)}
						</TabsContent>

						<TabsContent value="spans">
							{renderState(spanCountRows.length) ?? (
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
							)}
						</TabsContent>
					</div>
				</TabsRoot>
			</div>
		</FloatingPanel>
	);
}

export default AnalyticsPanel;
