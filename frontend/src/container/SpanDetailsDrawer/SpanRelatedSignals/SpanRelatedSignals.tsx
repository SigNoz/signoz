import './SpanRelatedSignals.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { Span } from 'types/api/trace/getTraceV2';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

import { RelatedSignalsViews } from '../constants';
import SpanLogs from '../SpanLogs/SpanLogs';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

interface AppliedFiltersProps {
	filters: TagFilterItem[];
}

function AppliedFilters({ filters }: AppliedFiltersProps): JSX.Element {
	return (
		<div className="span-related-signals-drawer__applied-filters">
			<div className="span-related-signals-drawer__filters-list">
				{filters.map((filter) => (
					<div key={filter.id} className="span-related-signals-drawer__filter-tag">
						<Typography.Text>
							{filter.key?.key}={filter.value}
						</Typography.Text>
					</div>
				))}
			</div>
		</div>
	);
}

interface SpanRelatedSignalsProps {
	selectedSpan: Span;
	traceStartTime: number;
	traceEndTime: number;
	isOpen: boolean;
	onClose: () => void;
	initialView: RelatedSignalsViews;
}

function SpanRelatedSignals({
	selectedSpan,
	traceStartTime,
	traceEndTime,
	isOpen,
	onClose,
	initialView,
}: SpanRelatedSignalsProps): JSX.Element {
	const [selectedView, setSelectedView] = useState<RelatedSignalsViews>(
		initialView,
	);
	const isDarkMode = useIsDarkMode();

	const handleTabChange = useCallback((e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	}, []);

	const handleClose = useCallback((): void => {
		setSelectedView(RelatedSignalsViews.LOGS);
		onClose();
	}, [onClose]);

	const appliedFilters = useMemo(
		(): TagFilterItem[] => [
			{
				id: 'trace-id-filter',
				key: {
					key: 'trace_id',
					id: 'trace-id-key',
					dataType: 'string' as const,
					isColumn: true,
					type: '',
					isJSON: false,
				} as BaseAutocompleteData,
				op: '=',
				value: selectedSpan.traceId,
			},
		],
		[selectedSpan.traceId],
	);

	const handleExplorerPageRedirect = useCallback((): void => {
		const startTimeMs = traceStartTime - FIVE_MINUTES_IN_MS;
		const endTimeMs = traceEndTime + FIVE_MINUTES_IN_MS;

		const traceIdFilter = {
			op: 'AND',
			items: [
				{
					id: 'trace-id-filter',
					key: {
						key: 'trace_id',
						id: 'trace-id-key',
						dataType: 'string' as const,
						isColumn: true,
						type: '',
						isJSON: false,
					} as BaseAutocompleteData,
					op: '=',
					value: selectedSpan.traceId,
				},
			],
		};

		const compositeQuery = {
			...initialQueryState,
			queryType: 'builder',
			builder: {
				...initialQueryState.builder,
				queryData: [
					{
						...initialQueryBuilderFormValuesMap.logs,
						aggregateOperator: LogsAggregatorOperator.NOOP,
						filters: traceIdFilter,
					},
				],
			},
		};

		const searchParams = new URLSearchParams();
		searchParams.set(QueryParams.compositeQuery, JSON.stringify(compositeQuery));
		searchParams.set(QueryParams.startTime, startTimeMs.toString());
		searchParams.set(QueryParams.endTime, endTimeMs.toString());

		window.open(
			`${window.location.origin}${
				ROUTES.LOGS_EXPLORER
			}?${searchParams.toString()}`,
			'_blank',
			'noopener,noreferrer',
		);
	}, [selectedSpan.traceId, traceStartTime, traceEndTime]);

	return (
		<Drawer
			width="50%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">
						Related Signals - {selectedSpan.name}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={isOpen}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="span-related-signals-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{selectedSpan && (
				<div className="span-related-signals-drawer__content">
					<div className="views-tabs-container">
						<SignozRadioGroup
							value={selectedView}
							options={[
								{
									label: (
										<div className="view-title">
											<LogsIcon width={14} height={14} />
											Logs
										</div>
									),
									value: RelatedSignalsViews.LOGS,
								},
								// {
								// 	label: (
								// 		<div className="view-title">
								// 			<LogsIcon width={14} height={14} />
								// 			Metrics
								// 		</div>
								// 	),
								// 	value: RelatedSignalsViews.METRICS,
								// },
								// {
								// 	label: (
								// 		<div className="view-title">
								// 			<Server size={14} />
								// 			Infra
								// 		</div>
								// 	),
								// 	value: RelatedSignalsViews.INFRA,
								// },
							]}
							onChange={handleTabChange}
							className="related-signals-radio"
						/>
						{selectedView === RelatedSignalsViews.LOGS && (
							<Button
								icon={<Compass size={18} />}
								className="open-in-explorer"
								onClick={handleExplorerPageRedirect}
							/>
						)}
					</div>

					{selectedView === RelatedSignalsViews.LOGS && (
						<>
							<AppliedFilters filters={appliedFilters} />
							<SpanLogs
								traceId={selectedSpan.traceId}
								spanId={selectedSpan.spanId}
								timeRange={{
									startTime: traceStartTime - FIVE_MINUTES_IN_MS,
									endTime: traceEndTime + FIVE_MINUTES_IN_MS,
								}}
								handleExplorerPageRedirect={handleExplorerPageRedirect}
							/>
						</>
					)}
				</div>
			)}
		</Drawer>
	);
}

export default SpanRelatedSignals;
