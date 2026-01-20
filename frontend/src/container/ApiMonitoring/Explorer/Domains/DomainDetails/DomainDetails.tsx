import './DomainDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useIsDarkMode } from 'hooks/useDarkMode';
import GetMinMax from 'lib/getMinMax';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import { useApiMonitoringParams } from '../../../queryParams';
import AllEndPoints from './AllEndPoints';
import DomainMetrics from './components/DomainMetrics';
import { VIEW_TYPES, VIEWS } from './constants';
import EndPointDetails from './EndPointDetails';
import TopErrors from './TopErrors';

const TimeRangeOffset = 1000000000;

function DomainDetails({
	domainData,
	handleClose,
	selectedDomainIndex,
	setSelectedDomainIndex,
	domainListLength,
	domainListFilters,
}: {
	domainData: any;
	handleClose: () => void;
	selectedDomainIndex: number;
	setSelectedDomainIndex: (index: number) => void;
	domainListLength: number;
	domainListFilters: IBuilderQuery['filters'];
}): JSX.Element {
	const [params, setParams] = useApiMonitoringParams();
	const [selectedView, setSelectedView] = useState<VIEWS>(
		(params.selectedView as VIEWS) || VIEWS.ALL_ENDPOINTS,
	);
	const [selectedEndPointName, setSelectedEndPointName] = useState<string>(
		params.selectedEndPointName || '',
	);
	const [endPointsGroupBy, setEndPointsGroupBy] = useState<
		IBuilderQuery['groupBy']
	>([]);
	const [initialFiltersEndPointStats, setInitialFiltersEndPointStats] = useState<
		IBuilderQuery['filters']
	>(domainListFilters);
	const isDarkMode = useIsDarkMode();

	const handleTabChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
		setParams({ selectedView: e.target.value });
	};

	const handleEndPointChange = (name: string): void => {
		setSelectedEndPointName(name);
		setParams({ selectedEndPointName: name });
	};

	useEffect(() => {
		if (params.selectedView && params.selectedView !== selectedView) {
			setSelectedView(params.selectedView as VIEWS);
		}
		if (
			params.selectedEndPointName !== undefined &&
			params.selectedEndPointName !== selectedEndPointName
		) {
			setSelectedEndPointName(params.selectedEndPointName);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.selectedView, params.selectedEndPointName]);

	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const startMs = useMemo(() => Math.floor(Number(minTime) / TimeRangeOffset), [
		minTime,
	]);
	const endMs = useMemo(() => Math.floor(Number(maxTime) / TimeRangeOffset), [
		maxTime,
	]);

	const [selectedInterval, setSelectedInterval] = useState<Time>(
		(params.selectedInterval as Time) || (selectedTime as Time),
	);

	// Sync params to local selectedInterval state on param change
	useEffect(() => {
		if (params.selectedInterval && params.selectedInterval !== selectedInterval) {
			setSelectedInterval(params.selectedInterval as Time);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.selectedInterval]);

	const [modalTimeRange, setModalTimeRange] = useState(() => {
		if (params.modalTimeRange) {
			return params.modalTimeRange;
		}
		return {
			startTime: startMs,
			endTime: endMs,
		};
	});

	// Sync params to local modalTimeRange state on param change
	useEffect(() => {
		if (
			params.modalTimeRange &&
			JSON.stringify(params.modalTimeRange) !== JSON.stringify(modalTimeRange)
		) {
			setModalTimeRange(params.modalTimeRange);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.modalTimeRange]);

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			setSelectedInterval(interval as Time);
			setParams({ selectedInterval: interval as string });

			if (interval === 'custom' && dateTimeRange) {
				const newRange = {
					startTime: Math.floor(dateTimeRange[0] / 1000),
					endTime: Math.floor(dateTimeRange[1] / 1000),
				};
				setModalTimeRange(newRange);
				setParams({ modalTimeRange: newRange });
			} else {
				const { maxTime, minTime } = GetMinMax(interval);

				const newRange = {
					startTime: Math.floor(minTime / TimeRangeOffset),
					endTime: Math.floor(maxTime / TimeRangeOffset),
				};
				setModalTimeRange(newRange);
				setParams({ modalTimeRange: newRange });
			}
		},
		[setParams],
	);

	return (
		<Drawer
			width="60%"
			title={
				<div className="domain-details-drawer-header">
					<div className="domain-details-drawer-header-title">
						<Divider type="vertical" />

						{domainData?.domainName && (
							<Typography.Text className="title">
								{domainData.domainName}
							</Typography.Text>
						)}
					</div>
					<div className="domain-details-drawer-header-right-container">
						<DateTimeSelectionV2
							showAutoRefresh={false}
							showRefreshText={false}
							onTimeChange={handleTimeChange}
							defaultRelativeTime="5m"
							isModalTimeSelection
							modalSelectedInterval={selectedInterval}
							modalInitialStartTime={modalTimeRange.startTime * 1000}
							modalInitialEndTime={modalTimeRange.endTime * 1000}
						/>
						<Button.Group className="domain-details-drawer-header-ctas">
							<Button
								className="domain-navigate-cta"
								onClick={(): void => {
									setSelectedDomainIndex(selectedDomainIndex - 1);
									setSelectedEndPointName('');
									setEndPointsGroupBy([]);
									setSelectedView(VIEW_TYPES.ALL_ENDPOINTS);
								}}
								icon={<ArrowUp size={16} />}
								disabled={selectedDomainIndex === 0}
								title="Previous domain"
							/>
							<Button
								className="domain-navigate-cta"
								onClick={(): void => {
									setSelectedDomainIndex(selectedDomainIndex + 1);
									setSelectedEndPointName('');
									setEndPointsGroupBy([]);
									setSelectedView(VIEW_TYPES.ALL_ENDPOINTS);
								}}
								icon={<ArrowDown size={16} />}
								disabled={selectedDomainIndex === domainListLength - 1}
								title="Next domain"
							/>
						</Button.Group>
					</div>
				</div>
			}
			placement="right"
			onClose={handleClose}
			open={!!domainData}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="domain-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{domainData && (
				<>
					<DomainMetrics
						domainName={domainData.domainName}
						domainListFilters={domainListFilters}
						timeRange={modalTimeRange}
					/>
					<div className="views-tabs-container">
						<Radio.Group
							className="views-tabs"
							onChange={handleTabChange}
							value={selectedView}
						>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.ALL_ENDPOINTS ? 'selected_view tab' : 'tab'
								}
								value={VIEW_TYPES.ALL_ENDPOINTS}
							>
								<div className="view-title">All Endpoints</div>
							</Radio.Button>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.ENDPOINT_STATS
										? 'tab selected_view'
										: 'tab'
								}
								value={VIEW_TYPES.ENDPOINT_STATS}
							>
								<div className="view-title">Endpoint(s) Stats</div>
							</Radio.Button>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.TOP_ERRORS ? 'tab selected_view' : 'tab'
								}
								value={VIEW_TYPES.TOP_ERRORS}
							>
								<div className="view-title">Top 10 Errors</div>
							</Radio.Button>
						</Radio.Group>
					</div>
					{selectedView === VIEW_TYPES.ALL_ENDPOINTS && (
						<AllEndPoints
							domainName={domainData.domainName}
							setSelectedEndPointName={handleEndPointChange}
							setSelectedView={setSelectedView}
							groupBy={endPointsGroupBy}
							setGroupBy={setEndPointsGroupBy}
							timeRange={modalTimeRange}
							initialFilters={domainListFilters}
							setInitialFiltersEndPointStats={setInitialFiltersEndPointStats}
						/>
					)}

					{selectedView === VIEW_TYPES.ENDPOINT_STATS && (
						<EndPointDetails
							domainName={domainData.domainName}
							endPointName={selectedEndPointName}
							setSelectedEndPointName={handleEndPointChange}
							initialFilters={initialFiltersEndPointStats}
							timeRange={modalTimeRange}
							handleTimeChange={handleTimeChange}
						/>
					)}

					{selectedView === VIEW_TYPES.TOP_ERRORS && (
						<TopErrors
							domainName={domainData.domainName}
							timeRange={modalTimeRange}
							initialFilters={domainListFilters}
						/>
					)}
				</>
			)}
		</Drawer>
	);
}

export default DomainDetails;
