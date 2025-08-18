import './BreakDown.styles.scss';

import { Typography } from 'antd';
// import useFilterConfig from 'components/QuickFilters/hooks/useFilterConfig';
// import { SignalType } from 'components/QuickFilters/types';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card, CardContainer } from 'container/GridCardLayout/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
// import { useGetQueryKeyValueSuggestions } from 'hooks/querySuggestions/useGetQueryKeyValueSuggestions';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { Widgets } from 'types/api/dashboard/getAll';
// import { DataSource } from 'types/common/queryBuilder';
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

// function FilterDropdown({ attrKey }: { attrKey: string }): JSX.Element {
// 	const {
// 		data: keyValueSuggestions,
// 		isLoading: isLoadingKeyValueSuggestions,
// 	} = useGetQueryKeyValueSuggestions({
// 		key: attrKey,
// 		signal: DataSource.METRICS,
// 		signalSource: 'meter',
// 		options: {
// 			keepPreviousData: true,
// 		},
// 	});

// 	const responseData = keyValueSuggestions?.data as any;
// 	const values = responseData?.data?.values || {};
// 	const stringValues = values.stringValues || [];
// 	const numberValues = values.numberValues || [];

// 	const stringOptions = stringValues.filter(
// 		(value: string | null | undefined): value is string =>
// 			value !== null && value !== undefined && value !== '',
// 	);

// 	const numberOptions = numberValues
// 		.filter(
// 			(value: number | null | undefined): value is number =>
// 				value !== null && value !== undefined,
// 		)
// 		.map((value: number) => value.toString());

// 	const vals = [...stringOptions, ...numberOptions];

// 	return (
// 		<div className="filter-dropdown">
// 			<Typography.Text>{attrKey}</Typography.Text>
// 			<Select
// 				loading={isLoadingKeyValueSuggestions}
// 				options={vals?.map((suggestion: any) => ({
// 					label: suggestion,
// 					value: suggestion,
// 				}))}
// 				placeholder={`Select ${attrKey}`}
// 			/>
// 		</div>
// 	);
// }

function BreakDown(): JSX.Element {
	// const { customFilters } = useFilterConfig({
	// 	signal: SignalType.METER_EXPLORER,
	// 	config: [],
	// });

	return (
		<div className="meter-explorer-breakdown">
			<section className="meter-explorer-date-time">
				{/* {customFilters.map((filter) => (
					<FilterDropdown key={filter.key} attrKey={filter.key} />
				))} */}
				<DateTimeSelectionV2 showAutoRefresh={false} />
			</section>
			<section className="meter-explorer-graphs">
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
