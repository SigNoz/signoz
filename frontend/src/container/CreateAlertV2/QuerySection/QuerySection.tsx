import { useCallback, useMemo } from 'react';
import { Button } from 'antd';
import classNames from 'classnames';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import QuerySectionComponent from 'container/FormAlertRules/QuerySection';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getMetricNameFromQueryData } from 'hooks/useGetYAxisUnit';
import useUrlQuery from 'hooks/useUrlQuery';
import { BarChart2, DraftingCompass, FileText, ScrollText } from 'lucide-react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { useCreateAlertState } from '../context';
import Stepper from '../Stepper';
import ChartPreview from './ChartPreview';
import { buildAlertDefForChartPreview } from './utils';

import './styles.scss';

function QuerySection(): JSX.Element {
	const {
		currentQuery,
		stagedQuery,
		handleRunQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();
	const { alertType, setAlertType, thresholdState } = useCreateAlertState();
	const urlQuery = useUrlQuery();

	const alertDef = buildAlertDefForChartPreview({ alertType, thresholdState });

	const onQueryCategoryChange = (queryType: EQueryType): void => {
		const query: Query = { ...currentQuery, queryType };
		redirectWithQueryBuilderData(query);
	};

	const source = useMemo(() => urlQuery.get(QueryParams.source) as YAxisSource, [
		urlQuery,
	]);

	const didQueryChange = useMemo(() => {
		if (alertType !== AlertTypes.METRICS_BASED_ALERT) {
			return false;
		}

		const selectedQueryName = thresholdState.selectedQuery;
		const currentQueryData = currentQuery.builder.queryData.find(
			(query) => query.queryName === selectedQueryName,
		);
		const stagedQueryData = stagedQuery?.builder.queryData.find(
			(query) => query.queryName === selectedQueryName,
		);
		if (!currentQueryData || !stagedQueryData) {
			return false;
		}

		const currentQueryKey = getMetricNameFromQueryData(currentQueryData);
		const stagedQueryKey = getMetricNameFromQueryData(stagedQueryData);
		return currentQueryKey !== stagedQueryKey;
	}, [currentQuery, alertType, thresholdState, stagedQuery]);

	const runQueryHandler = useCallback(() => {
		// Reset the source param when the query is changed
		// Then manually run the query
		if (source === YAxisSource.DASHBOARDS && didQueryChange) {
			redirectWithQueryBuilderData(currentQuery, {
				[QueryParams.source]: null,
			});
		} else {
			handleRunQuery();
		}
	}, [
		currentQuery,
		didQueryChange,
		handleRunQuery,
		redirectWithQueryBuilderData,
		source,
	]);

	const tabs = [
		{
			label: 'Metrics',
			icon: <BarChart2 size={14} data-testid="metrics-view" />,
			value: AlertTypes.METRICS_BASED_ALERT,
		},
		{
			label: 'Logs',
			icon: <ScrollText size={14} data-testid="logs-view" />,
			value: AlertTypes.LOGS_BASED_ALERT,
		},
		{
			label: 'Traces',
			icon: <DraftingCompass size={14} data-testid="traces-view" />,
			value: AlertTypes.TRACES_BASED_ALERT,
		},
		{
			label: 'Exceptions',
			icon: <FileText size={14} data-testid="exceptions-view" />,
			value: AlertTypes.EXCEPTIONS_BASED_ALERT,
		},
	];

	return (
		<div className="query-section">
			<Stepper stepNumber={1} label="Define the query" />
			<ChartPreview alertDef={alertDef} source={source} />
			<div className="query-section-tabs">
				<div className="query-section-query-actions">
					{tabs.map((tab) => (
						<Button
							key={tab.value}
							className={classNames('list-view-tab', 'explorer-view-option', {
								'active-tab': alertType === tab.value,
							})}
							onClick={(): void => {
								setAlertType(tab.value as AlertTypes);
							}}
						>
							{tab.icon}
							{tab.label}
						</Button>
					))}
				</div>
			</div>
			<QuerySectionComponent
				queryCategory={currentQuery.queryType}
				setQueryCategory={onQueryCategoryChange}
				alertType={alertType}
				runQuery={runQueryHandler}
				alertDef={alertDef}
				panelType={PANEL_TYPES.TIME_SERIES}
				key={currentQuery.queryType}
				ruleId=""
				hideTitle
			/>
		</div>
	);
}

export default QuerySection;
