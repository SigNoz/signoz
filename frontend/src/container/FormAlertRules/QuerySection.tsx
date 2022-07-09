import { PlusOutlined } from '@ant-design/icons';
import { Button, message, Modal, notification, Tabs } from 'antd';
import TextToolTip from 'components/TextToolTip';
import MetricsBuilderFormula from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/formula';
import MetricsBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/query';
import {
	IQueryBuilderFormulaHandleChange,
	IQueryBuilderQueryHandleChange,
} from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/types';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
	IFormulaQueries,
	IMetricQueries,
	IPromQueries,
} from 'types/api/alerts/compositeQuery';
import { Query as StagedQuery } from 'types/api/dashboard/getAll';
import { EAggregateOperator, EQueryType } from 'types/common/dashboard';

import PromqlSection from './PromqlSection';
import {
	ButtonContainer,
	FormContainer,
	QueryButton,
	QueryContainer,
	StepHeading,
} from './styles';
import { prepareStagedQuery, toIMetricsBuilderQuery } from './utils';

const { TabPane } = Tabs;
function QuerySection({
	queryChanged,
	queryCategory,
	setQueryCategory,
	metricQueries,
	setMetricQueries,
	formulaQueries,
	setFormulaQueries,
	promQueries,
	setPromQueries,
	setStagedQuery,
}: QuerySectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('rules');

	const handleQueryCategoryChange = (s: string): void => {
		if (
			parseInt(s, 10) === EQueryType.PROM &&
			(!promQueries || Object.keys(promQueries).length === 0)
		) {
			setPromQueries({
				A: {
					query: '',
					stats: '',
					name: 'A',
					legend: '',
					disabled: false,
				},
			});
		}
		console.log('setting category:', parseInt(s, 10));
		setQueryCategory(parseInt(s, 10));
	};

	const getNextQueryLabel = useCallback((): string => {
		const queryCount =
			Object.keys(metricQueries).length + Object.keys(formulaQueries).length;

		return String.fromCharCode(64 + queryCount + 1);
	}, [metricQueries, formulaQueries]);

	const handleStageQuery = async (): Promise<void> => {
		const s: StagedQuery = prepareStagedQuery(
			queryCategory,
			metricQueries,
			formulaQueries,
			promQueries,
		);
		setStagedQuery(s);
	};

	const handleFormulaChange = ({
		formulaIndex,
		expression,
		toggleDisable,
		toggleDelete,
	}: IQueryBuilderFormulaHandleChange): void => {
		const allFormulas = formulaQueries;
		const current = allFormulas[formulaIndex];
		if (expression) {
			current.expression = expression;
		}

		if (toggleDisable) {
			current.disabled = !current.disabled;
		}

		if (toggleDelete) {
			delete allFormulas[formulaIndex];
		} else {
			allFormulas[formulaIndex] = current;
		}

		setFormulaQueries({
			...allFormulas,
		});
	};

	const handleMetricQueryChange = ({
		queryIndex,
		aggregateFunction,
		metricName,
		tagFilters,
		groupBy,
		legend,
		toggleDisable,
		toggleDelete,
	}: IQueryBuilderQueryHandleChange): void => {
		const allQueries = metricQueries;
		const current = metricQueries[queryIndex];
		if (aggregateFunction) {
			current.aggregateOperator = aggregateFunction;
		}
		if (metricName) {
			current.metricName = metricName;
		}

		if (tagFilters && current.tagFilters) {
			current.tagFilters.items = tagFilters;
		}

		if (legend) {
			current.legend = legend;
		}

		if (groupBy) {
			current.groupBy = groupBy;
		}

		if (toggleDisable) {
			current.disabled = !current.disabled;
		}

		if (toggleDelete) {
			delete allQueries[queryIndex];
		} else {
			allQueries[queryIndex] = current;
		}

		setMetricQueries({
			...allQueries,
		});
	};

	const addMetricQuery = useCallback(async () => {
		if (Object.keys(metricQueries).length > 4) {
			notification.error({
				message:
					'Unable to create query. You can create at max 5 queries and 1 formulae.',
			});
			return;
		}
		const queryLabel = getNextQueryLabel();

		const queries = metricQueries;
		queries[queryLabel] = {
			name: queryLabel,
			queryName: queryLabel,
			metricName: 'signoz_latency_count',
			formulaOnly: false,
			aggregateOperator: EAggregateOperator.NOOP,
			legend: '',
			tagFilters: {
				op: 'AND',
				items: [],
			},
			groupBy: [],
			disabled: false,
			expression: queryLabel,
		};
		setMetricQueries({ ...queries });
	}, [getNextQueryLabel, metricQueries, setMetricQueries]);

	const addFormula = useCallback(async () => {
		if (Object.keys(formulaQueries).length === 1) {
			notification.error({
				message:
					'can not add formula. Only one formula is supported in the alert rule.',
			});
			return;
		}

		const queryLabel = getNextQueryLabel();

		const formulas = formulaQueries;
		formulas[queryLabel] = {
			queryName: queryLabel,
			name: queryLabel,
			formulaOnly: true,
			expression: 'A',
			disabled: false,
		};

		setFormulaQueries({ ...formulas });
	}, [getNextQueryLabel, formulaQueries, setFormulaQueries]);

	const renderPromqlUI = (): JSX.Element => {
		return (
			<PromqlSection promQueries={promQueries} setPromQueries={setPromQueries} />
		);
	};

	const renderFormulaButton = (): JSX.Element => {
		return (
			<QueryButton onClick={addFormula} icon={<PlusOutlined />}>
				{t('button_formula')}
			</QueryButton>
		);
	};

	const renderQueryButton = (): JSX.Element => {
		return (
			<QueryButton onClick={addMetricQuery} icon={<PlusOutlined />}>
				{t('button_query')}
			</QueryButton>
		);
	};

	const renderMetricUI = (): JSX.Element => {
		return (
			<div>
				{metricQueries &&
					Object.keys(metricQueries).map((key: string) => {
						// todo(amol): need to handle this in fetch
						const current = metricQueries[key];
						current.name = key;

						return (
							<MetricsBuilder
								key={key}
								queryIndex={key}
								queryData={toIMetricsBuilderQuery(current)}
								selectedGraph="TIME_SERIES"
								handleQueryChange={handleMetricQueryChange}
							/>
						);
					})}

				{queryCategory !== EQueryType.PROM && renderQueryButton()}
				<div style={{ marginTop: '1rem' }}>
					{formulaQueries &&
						Object.keys(formulaQueries).map((key: string) => {
							// todo(amol): need to handle this in fetch
							const current = formulaQueries[key];
							current.name = key;

							return (
								<MetricsBuilderFormula
									key={key}
									formulaIndex={key}
									formulaData={current}
									handleFormulaChange={handleFormulaChange}
								/>
							);
						})}
					{queryCategory !== EQueryType.PROM && renderFormulaButton()}
				</div>
			</div>
		);
	};
	return (
		<>
			<StepHeading> Step 1 - Define the metric</StepHeading>
			<FormContainer>
				<div style={{ display: 'flex' }}>
					<Tabs
						type="card"
						style={{ width: '100%' }}
						defaultActiveKey={EQueryType.QUERY_BUILDER.toString()}
						activeKey={queryCategory.toString()}
						onChange={handleQueryCategoryChange}
						// {tabBarExtraContent={
						// 	<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
						// 		<TextToolTip
						// 			{...{
						// 				text: `Preview Chart: This will stage and run the current query in the tab. Use this option to get a preview of query result.`,
						// 			}}
						// 		/>
						// 		<Button type="primary" onClick={handleStageQuery}>
						// 			Preview Chart
						// 		</Button>
						// 	</span>
						// }
					>
						<TabPane tab={t('tab_qb')} key={EQueryType.QUERY_BUILDER.toString()} />
						<TabPane tab={t('tab_promql')} key={EQueryType.PROM.toString()} />
					</Tabs>
				</div>
				{queryCategory === EQueryType.PROM ? renderPromqlUI() : renderMetricUI()}
			</FormContainer>
		</>
	);
}

interface QuerySectionProps {
	queryChanged: boolean;
	queryCategory: EQueryType;
	setQueryCategory: (n: EQueryType) => void;
	metricQueries: IMetricQueries;
	setMetricQueries: (b: IMetricQueries) => void;
	formulaQueries: IFormulaQueries;
	setFormulaQueries: (b: IFormulaQueries) => void;
	promQueries: IPromQueries;
	setPromQueries: (p: IPromQueries) => void;
	stagedQuery: StagedQuery | undefined;
	setStagedQuery: (q: StagedQuery) => void;
}

export default QuerySection;
