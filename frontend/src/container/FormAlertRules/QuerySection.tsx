import { PlusOutlined } from '@ant-design/icons';
import { Button, notification, Tabs } from 'antd';
import MetricsBuilderFormula from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/formula';
import MetricsBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/query';
import {
	IQueryBuilderFormulaHandleChange,
	IQueryBuilderQueryHandleChange,
} from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/types';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	IChQueries,
	IFormulaQueries,
	IMetricQueries,
	IPromQueries,
} from 'types/api/alerts/compositeQuery';
import { EAggregateOperator, EQueryType } from 'types/common/dashboard';

import ChQuerySection from './ChQuerySection';
import PromqlSection from './PromqlSection';
import { FormContainer, QueryButton, StepHeading } from './styles';
import { toIMetricsBuilderQuery } from './utils';

const { TabPane } = Tabs;
function QuerySection({
	queryCategory,
	setQueryCategory,
	metricQueries,
	setMetricQueries,
	formulaQueries,
	setFormulaQueries,
	promQueries,
	setPromQueries,
	chQueries,
	setChQueries,
	alertType,
	runQuery,
}: QuerySectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

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

		if (
			parseInt(s, 10) === EQueryType.CLICKHOUSE &&
			(!chQueries || Object.keys(chQueries).length === 0)
		) {
			setChQueries({
				A: {
					rawQuery: '',
					name: 'A',
					query: '',
					legend: '',
					disabled: false,
				},
			});
		}
		setQueryCategory(parseInt(s, 10));
	};

	const getNextQueryLabel = useCallback((): string => {
		let maxAscii = 0;

		Object.keys(metricQueries).forEach((key) => {
			const n = key.charCodeAt(0);
			if (n > maxAscii) {
				maxAscii = n - 64;
			}
		});

		return String.fromCharCode(64 + maxAscii + 1);
	}, [metricQueries]);

	const handleFormulaChange = ({
		formulaIndex,
		expression,
		legend,
		toggleDisable,
		toggleDelete,
	}: IQueryBuilderFormulaHandleChange): void => {
		const allFormulas = formulaQueries;
		const current = allFormulas[formulaIndex];
		if (expression !== undefined) {
			current.expression = expression;
		}

		if (legend !== undefined) {
			current.legend = legend;
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

	const addMetricQuery = useCallback(() => {
		if (Object.keys(metricQueries).length > 5) {
			notification.error({
				message: t('metric_query_max_limit'),
			});
			return;
		}

		const queryLabel = getNextQueryLabel();

		const queries = metricQueries;
		queries[queryLabel] = {
			name: queryLabel,
			queryName: queryLabel,
			metricName: '',
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
	}, [t, getNextQueryLabel, metricQueries, setMetricQueries]);

	const addFormula = useCallback(() => {
		// defaulting to F1 as only one formula is supported
		// in alert definition
		const queryLabel = 'F1';

		const formulas = formulaQueries;
		formulas[queryLabel] = {
			queryName: queryLabel,
			name: queryLabel,
			formulaOnly: true,
			expression: 'A',
			disabled: false,
			legend: '',
		};

		setFormulaQueries({ ...formulas });
	}, [formulaQueries, setFormulaQueries]);

	const renderPromqlUI = (): JSX.Element => {
		return (
			<PromqlSection promQueries={promQueries} setPromQueries={setPromQueries} />
		);
	};

	const renderChQueryUI = (): JSX.Element => {
		return <ChQuerySection chQueries={chQueries} setChQueries={setChQueries} />;
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
					{queryCategory === EQueryType.QUERY_BUILDER &&
						(!formulaQueries || Object.keys(formulaQueries).length === 0) &&
						metricQueries &&
						Object.keys(metricQueries).length > 0 &&
						renderFormulaButton()}
				</div>
			</div>
		);
	};

	const handleRunQuery = (): void => {
		runQuery();
	};

	const renderTabs = (typ: AlertTypes): JSX.Element | null => {
		switch (typ) {
			case AlertTypes.TRACES_BASED_ALERT:
			case AlertTypes.LOGS_BASED_ALERT:
			case AlertTypes.EXCEPTIONS_BASED_ALERT:
				return (
					<Tabs
						type="card"
						style={{ width: '100%' }}
						defaultActiveKey={EQueryType.CLICKHOUSE.toString()}
						activeKey={queryCategory.toString()}
						onChange={handleQueryCategoryChange}
						tabBarExtraContent={
							<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
								{queryCategory === EQueryType.CLICKHOUSE && (
									<Button type="primary" onClick={handleRunQuery}>
										Run Query
									</Button>
								)}
							</span>
						}
					>
						<TabPane
							tab={t('tab_qb')}
							key={EQueryType.QUERY_BUILDER.toString()}
							disabled
						/>
						<TabPane tab={t('tab_chquery')} key={EQueryType.CLICKHOUSE.toString()} />
					</Tabs>
				);
			case AlertTypes.METRICS_BASED_ALERT:
			default:
				return (
					<Tabs
						type="card"
						style={{ width: '100%' }}
						defaultActiveKey={EQueryType.QUERY_BUILDER.toString()}
						activeKey={queryCategory.toString()}
						onChange={handleQueryCategoryChange}
						tabBarExtraContent={
							<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
								{queryCategory === EQueryType.CLICKHOUSE && (
									<Button type="primary" onClick={handleRunQuery}>
										Run Query
									</Button>
								)}
							</span>
						}
					>
						<TabPane tab={t('tab_qb')} key={EQueryType.QUERY_BUILDER.toString()} />
						<TabPane tab={t('tab_chquery')} key={EQueryType.CLICKHOUSE.toString()} />
						<TabPane tab={t('tab_promql')} key={EQueryType.PROM.toString()} />
					</Tabs>
				);
		}
	};
	const renderQuerySection = (c: EQueryType): JSX.Element | null => {
		switch (c) {
			case EQueryType.PROM:
				return renderPromqlUI();
			case EQueryType.CLICKHOUSE:
				return renderChQueryUI();
			case EQueryType.QUERY_BUILDER:
				return renderMetricUI();
			default:
				return null;
		}
	};
	return (
		<>
			<StepHeading> {t('alert_form_step1')}</StepHeading>
			<FormContainer>
				<div style={{ display: 'flex' }}>{renderTabs(alertType)}</div>
				{renderQuerySection(queryCategory)}
			</FormContainer>
		</>
	);
}

interface QuerySectionProps {
	queryCategory: EQueryType;
	setQueryCategory: (n: EQueryType) => void;
	metricQueries: IMetricQueries;
	setMetricQueries: (b: IMetricQueries) => void;
	formulaQueries: IFormulaQueries;
	setFormulaQueries: (b: IFormulaQueries) => void;
	promQueries: IPromQueries;
	setPromQueries: (p: IPromQueries) => void;
	chQueries: IChQueries;
	setChQueries: (q: IChQueries) => void;
	alertType: AlertTypes;
	runQuery: () => void;
}

export default QuerySection;
