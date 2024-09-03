// import { Color } from '@signozhq/design-tokens';
import { ColumnsType } from 'antd/es/table';
// import { QueryParams } from 'constants/query';
// import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ConditionalAlertPopover } from 'container/AlertHistory/AlertPopover/AlertPopover';
// import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
// import { useIsDarkMode } from 'hooks/useDarkMode';
// import useUrlQuery from 'hooks/useUrlQuery';
// import { Search } from 'lucide-react';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import AlertState from 'pages/AlertDetails/AlertHeader/AlertState/AlertState';
// import { useMemo } from 'react';
// import { useQueryClient } from 'react-query';
// import { SuccessResponse } from 'types/api';
import { AlertRuleTimelineTableResponse } from 'types/api/alerts/def';
// import { PayloadProps } from 'types/api/alerts/get';
// import {
// 	IBuilderQuery,
// 	TagFilter,
// } from 'types/api/queryBuilder/queryBuilderData';
import { formatEpochTimestamp } from 'utils/timeUtils';

// function LabelFilter({
// 	filters,
// 	setFilters,
// }: {
// 	setFilters: (text: TagFilter) => void;
// 	filters: TagFilter;
// }): JSX.Element | null {
// 	const isDarkMode = useIsDarkMode();

// 	const queryClient = useQueryClient();
// 	const urlQuery = useUrlQuery();
// 	const ruleId = urlQuery.get(QueryParams.ruleId);

// 	const data = queryClient.getQueryData<SuccessResponse<PayloadProps>>([
// 		REACT_QUERY_KEY.ALERT_RULE_DETAILS,
// 		ruleId,
// 	]);

// 	const query = useMemo(() => {
// 		const compositeQueries = data?.payload?.data?.condition.compositeQuery;
// 		const query = compositeQueries?.builderQueries?.A;

// 		return {
// 			...query,
// 			filters,
// 		} as IBuilderQuery;
// 	}, [data?.payload?.data?.condition.compositeQuery, filters]);

// 	if (!data) {
// 		return null;
// 	}

// 	const handleSearch = (tagFilters: TagFilter): void => {
// 		const tagFiltersLength = tagFilters.items.length;

// 		if (
// 			(!tagFiltersLength && (!filters || !filters.items.length)) ||
// 			tagFiltersLength === filters?.items.length
// 		)
// 			return;

// 		setFilters(tagFilters);
// 	};

// 	return (
// 		<QueryBuilderSearch
// 			query={query}
// 			onChange={handleSearch}
// 			className="alert-history-label-search"
// 			suffixIcon={
// 				<Search
// 					size={14}
// 					color={isDarkMode ? Color.TEXT_VANILLA_100 : Color.TEXT_INK_100}
// 				/>
// 			}
// 		/>
// 	);
// }

export const timelineTableColumns = (): // filters: TagFilter,
// setFilters: (text: TagFilter) => void,
// currentUnit?: string,
// targetUnit?: string,
ColumnsType<AlertRuleTimelineTableResponse> => [
	{
		title: 'STATE',
		dataIndex: 'state',
		sorter: true,
		width: '12.5%',
		render: (value, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-state">
					<AlertState state={value} showLabel />
				</div>
			</ConditionalAlertPopover>
		),
	},
	{
		title: 'LABELS',
		// <LabelFilter setFilters={setFilters} filters={filters} />
		dataIndex: 'labels',
		width: '54.5%',
		render: (labels, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-labels">
					<AlertLabels labels={labels} />
				</div>
			</ConditionalAlertPopover>
		),
	},
	// temporarily comment value column
	// {
	// 	title: 'VALUE',
	// 	dataIndex: 'value',
	// 	width: '14%',
	// 	render: (value, record): JSX.Element => (
	// 		<ConditionalAlertPopover
	// 			relatedTracesLink={record.relatedTracesLink}
	// 			relatedLogsLink={record.relatedLogsLink}
	// 		>
	// 			<div className="alert-rule-value">
	// 				{/* convert the value based on y axis and target unit */}
	// 				{convertValue(value.toFixed(2), currentUnit, targetUnit)}
	// 			</div>
	// 		</ConditionalAlertPopover>
	// 	),
	// },
	{
		title: 'CREATED AT',
		dataIndex: 'unixMilli',
		width: '32.5%',
		render: (value, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-created-at">{formatEpochTimestamp(value)}</div>
			</ConditionalAlertPopover>
		),
	},
];
