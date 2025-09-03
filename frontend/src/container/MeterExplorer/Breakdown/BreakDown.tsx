import './BreakDown.styles.scss';

import { Alert, Typography } from 'antd';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card, CardContainer } from 'container/GridCardLayout/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { Widgets } from 'types/api/dashboard/getAll';
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
	return (
		<div className="meter-explorer-breakdown">
			<section className="meter-explorer-date-time">
				<DateTimeSelectionV2 showAutoRefresh={false} />
			</section>
			<section className="meter-explorer-graphs">
				<section className="info">
					<Alert
						type="info"
						showIcon
						message="Billing is calculated in UTC. To match your meter data with billing, select full-day ranges in UTC time (00:00 – 23:59 UTC). 
						For example, if you’re in IST, for the billing of Jan 1, select your time range as Jan 1, 5:30 AM – Jan 2, 5:29 AM IST."
					/>
					{isCloudUser && (
						<Alert
							type="warning"
							showIcon
							message="Meter module data is accurate only from 22nd August 2025, 00:00 UTC onwards. Data before this time was collected during the beta phase and may be inaccurate."
						/>
					)}
				</section>
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
