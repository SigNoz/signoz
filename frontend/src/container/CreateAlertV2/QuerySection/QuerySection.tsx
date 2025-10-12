import './styles.scss';

import { Button } from 'antd';
import classNames from 'classnames';
import { PANEL_TYPES } from 'constants/queryBuilder';
import QuerySectionComponent from 'container/FormAlertRules/QuerySection';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { BarChart2, DraftingCompass, FileText, ScrollText } from 'lucide-react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { useCreateAlertState } from '../context';
import Stepper from '../Stepper';
import ChartPreview from './ChartPreview';
import { buildAlertDefForChartPreview } from './utils';

function QuerySection(): JSX.Element {
	const {
		currentQuery,
		handleRunQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();
	const { alertType, setAlertType, thresholdState } = useCreateAlertState();

	const alertDef = buildAlertDefForChartPreview({ alertType, thresholdState });

	const onQueryCategoryChange = (queryType: EQueryType): void => {
		const query: Query = { ...currentQuery, queryType };
		redirectWithQueryBuilderData(query);
	};

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
			<ChartPreview alertDef={alertDef} />
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
				runQuery={handleRunQuery}
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
