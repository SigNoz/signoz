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
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import AllEndPoints from './AllEndPoints';
import DomainMetrics from './components/DomainMetrics';
import { VIEW_TYPES, VIEWS } from './constants';
import EndPointDetailsWrapper from './EndPointDetailsWrapper';
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
	const [selectedView, setSelectedView] = useState<VIEWS>(VIEWS.ALL_ENDPOINTS);
	const [selectedEndPointName, setSelectedEndPointName] = useState<string>('');
	const [endPointsGroupBy, setEndPointsGroupBy] = useState<
		IBuilderQuery['groupBy']
	>([]);
	const isDarkMode = useIsDarkMode();

	const handleTabChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

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
		selectedTime as Time,
	);

	const [modalTimeRange, setModalTimeRange] = useState(() => ({
		startTime: startMs,
		endTime: endMs,
	}));

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			setSelectedInterval(interval as Time);

			if (interval === 'custom' && dateTimeRange) {
				setModalTimeRange({
					startTime: Math.floor(dateTimeRange[0] / 1000),
					endTime: Math.floor(dateTimeRange[1] / 1000),
				});
			} else {
				const { maxTime, minTime } = GetMinMax(interval);

				setModalTimeRange({
					startTime: Math.floor(minTime / TimeRangeOffset),
					endTime: Math.floor(maxTime / TimeRangeOffset),
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	return (
		<Drawer
			width="60%"
			title={
				<div className="domain-details-drawer-header">
					<div className="domain-details-drawer-header-title">
						<Divider type="vertical" />
						<Typography.Text className="title">
							{domainData.domainName}
						</Typography.Text>
					</div>
					<div className="domain-details-drawer-header-right-container">
						<DateTimeSelectionV2
							showAutoRefresh={false}
							showRefreshText={false}
							onTimeChange={handleTimeChange}
							defaultRelativeTime="5m"
							isModalTimeSelection
							modalSelectedInterval={selectedInterval}
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
					<DomainMetrics domainData={domainData} />
					<div className="views-tabs-container">
						<Radio.Group
							className="views-tabs"
							onChange={handleTabChange}
							value={selectedView}
						>
							<Radio.Button
								className={
									// eslint-disable-next-line sonarjs/no-duplicate-string
									selectedView === VIEW_TYPES.ALL_ENDPOINTS ? 'selected_view tab' : 'tab'
								}
								value={VIEW_TYPES.ALL_ENDPOINTS}
							>
								<div className="view-title">All Endpoints</div>
							</Radio.Button>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.ENDPOINT_DETAILS
										? 'tab selected_view'
										: 'tab'
								}
								value={VIEW_TYPES.ENDPOINT_DETAILS}
							>
								<div className="view-title">Endpoint Details</div>
							</Radio.Button>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.TOP_ERRORS ? 'tab selected_view' : 'tab'
								}
								value={VIEW_TYPES.TOP_ERRORS}
							>
								<div className="view-title">Top Errors</div>
							</Radio.Button>
						</Radio.Group>
					</div>
					{selectedView === VIEW_TYPES.ALL_ENDPOINTS && (
						<AllEndPoints
							domainName={domainData.domainName}
							setSelectedEndPointName={setSelectedEndPointName}
							setSelectedView={setSelectedView}
							groupBy={endPointsGroupBy}
							setGroupBy={setEndPointsGroupBy}
							timeRange={modalTimeRange}
						/>
					)}

					{selectedView === VIEW_TYPES.ENDPOINT_DETAILS && (
						<EndPointDetailsWrapper
							domainName={domainData.domainName}
							endPointName={selectedEndPointName}
							setSelectedEndPointName={setSelectedEndPointName}
							domainListFilters={domainListFilters}
							timeRange={modalTimeRange}
						/>
					)}

					{selectedView === VIEW_TYPES.TOP_ERRORS && (
						<TopErrors
							domainName={domainData.domainName}
							timeRange={modalTimeRange}
						/>
					)}
				</>
			)}
		</Drawer>
	);
}

export default DomainDetails;
