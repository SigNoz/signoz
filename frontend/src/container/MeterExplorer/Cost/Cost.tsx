import './Cost.styles.scss';

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
} from './graphs';

type MetricSection = {
	id: string;
	title: string;
	description: string;
	graphs: Widgets[];
};

const sections: MetricSection[] = [
	{
		id: uuid(),
		title: 'Logs',
		description:
			'Log Meter provides insights for the size (in bytes) and count of log records ingested in SigNoz',
		graphs: [getLogCountWidgetData(), getLogSizeWidgetData()],
	},
	{
		id: uuid(),
		title: 'Traces',
		description:
			'Span Meter provides insights for the size (in bytes) and count of spans ingested in SigNoz',
		graphs: [getSpanCountWidgetData(), getSpanSizeWidgetData()],
	},
	{
		id: uuid(),
		title: 'Metrics',
		description:
			'Metric Meter depicts the count of metric datapoints ingested in SigNoz',
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

function Cost(): JSX.Element {
	// const { customFilters } = useFilterConfig({
	// 	signal: SignalType.METER_EXPLORER,
	// 	config: [],
	// });

	return (
		<div className="meter-explorer-cost">
			<section className="meter-explorer-date-time">
				{/* {customFilters.map((filter) => (
					<FilterDropdown key={filter.key} attrKey={filter.key} />
				))} */}
				<DateTimeSelectionV2 showAutoRefresh={false} />
			</section>
			<section className="meter-explorer-graphs">
				{sections.map((section) => (
					<Section
						key={section.id}
						id={section.id}
						title={section.title}
						description={section.description}
						graphs={section.graphs}
					/>
				))}
			</section>
		</div>
	);
}

export default Cost;
