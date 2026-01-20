import './BreakDown.styles.scss';

import { Alert, Typography } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card, CardContainer } from 'container/GridCardLayout/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuid } from 'uuid';

import {
	getLogCountWidgetData,
	getLogSizeWidgetData,
	getMetricCountWidgetData,
	getSpanCountWidgetData,
	getSpanSizeWidgetData,
	getTotalLogSizeWidgetData,
	getTotalMetricDatapointCountWidgetData,
	getTotalTraceSizeWidgetData,
} from './graphs';

type MetricSection = {
	id: string;
	title: string;
	graphs: Widgets[];
};

const sections: MetricSection[] = [
	{
		id: uuid(),
		title: 'Total',
		graphs: [
			getTotalLogSizeWidgetData(),
			getTotalTraceSizeWidgetData(),
			getTotalMetricDatapointCountWidgetData(),
		],
	},
	{
		id: uuid(),
		title: 'Logs',
		graphs: [getLogCountWidgetData(), getLogSizeWidgetData()],
	},
	{
		id: uuid(),
		title: 'Traces',
		graphs: [getSpanCountWidgetData(), getSpanSizeWidgetData()],
	},
	{
		id: uuid(),
		title: 'Metrics',
		graphs: [getMetricCountWidgetData()],
	},
];

function Section(section: MetricSection): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { title, graphs } = section;
	const history = useHistory();
	const { pathname } = useLocation();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, history, pathname, urlQuery],
	);

	return (
		<div className="meter-column-graph">
			<CardContainer className="row-card" isDarkMode={isDarkMode}>
				<Typography.Text className="section-title">{title}</Typography.Text>
			</CardContainer>
			<div className="meter-page-grid">
				{graphs.map((widget) => (
					<Card
						key={widget?.id}
						isDarkMode={isDarkMode}
						$panelType={PANEL_TYPES.BAR}
						className="meter-graph"
					>
						<GridCard widget={widget} onDragSelect={onDragSelect} version="v5" />
					</Card>
				))}
			</div>
		</div>
	);
}

function BreakDown(): JSX.Element {
	const { isCloudUser } = useGetTenantLicense();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const showInfo =
		getLocalStorageApi(LOCALSTORAGE.DISSMISSED_COST_METER_INFO) !== 'true';
	const isDateBeforeAugust22nd2025 = (minTime: number): boolean => {
		const august22nd2025UTC = dayjs.utc('2025-08-22T00:00:00Z');
		return dayjs(minTime / 1e6).isBefore(august22nd2025UTC);
	};
	const showShortRangeWarning = (maxTime - minTime) / 1e6 < 61 * 60 * 1000;

	return (
		<div className="meter-explorer-breakdown">
			<section className="meter-explorer-date-time">
				<DateTimeSelectionV2 showAutoRefresh={false} />
			</section>
			<section className="meter-explorer-graphs">
				{showInfo && (
					<Alert
						type="info"
						showIcon
						closable
						onClose={(): void => {
							setLocalStorageApi(LOCALSTORAGE.DISSMISSED_COST_METER_INFO, 'true');
						}}
						message="Billing is calculated in UTC. To match your meter data with billing, select full-day ranges in UTC time (00:00 – 23:59 UTC). 
						For example, if you’re in PT, for the billing of Jan 1, select your time range as Dec 31, 4:00 PM – Jan 1, 3:59 PM PT."
					/>
				)}
				{isCloudUser && isDateBeforeAugust22nd2025(minTime) && (
					<Alert
						type="warning"
						showIcon
						message="Meter module data is accurate only from 22nd August 2025, 00:00 UTC onwards. Data before this time was collected during the beta phase and may be inaccurate."
					/>
				)}

				{showShortRangeWarning && (
					<Alert
						type="warning"
						showIcon
						closable
						message={
							<>
								Meter metrics data is aggregated over 1 hour period. Please select time
								range accordingly.&nbsp;
								<a
									href="https://signoz.io/docs/cost-meter/overview/#accessing-cost-meter"
									rel="noopener noreferrer"
									target="_blank"
									style={{ textDecoration: 'underline' }}
								>
									Learn more
								</a>
								.
							</>
						}
					/>
				)}
				<section className="total">
					<Section
						id={sections[0].id}
						title={sections[0].title}
						graphs={sections[0].graphs}
					/>
				</section>
				{sections.map((section, idx) => {
					if (idx === 0) {
						return;
					}

					return (
						<Section
							key={section.id}
							id={section.id}
							title={section.title}
							graphs={section.graphs}
						/>
					);
				})}
			</section>
		</div>
	);
}

export default BreakDown;
