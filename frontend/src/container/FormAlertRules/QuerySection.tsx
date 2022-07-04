import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { message, Modal, notification, Tabs } from 'antd';
import MetricsBuilderFormula from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/formula';
import MetricsBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/query';
import {
	IQueryBuilderFormulaHandleChange,
	IQueryBuilderQueryHandleChange,
} from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/types';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
	IFormulaQueries,
	IMetricQueries,
	IPromQueries,
} from 'types/api/alerts/compositeQuery';
import {
	PROMQL,
	QUERY_BUILDER,
	QueryType,
	resolveQueryCategoryName,
} from 'types/api/alerts/queryType';
import { EAggregateOperator } from 'types/common/dashboard';

import PromqlSection from './PromqlSection';
import {
	ButtonContainer,
	FormContainer,
	QueryButton,
	QueryContainer,
	StepHeading,
} from './styles';
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
	allowCategoryChange,
}: QuerySectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('rules');

	const handleQueryCategoryChange = (s: string): void => {
		if (!allowCategoryChange) {
			notification.error({
				message:
					'Changes to query category are not allowed. Please create a new rule if the rule condition has changed.',
			});
			return;
		}

		const popupContent = `This will set the query format to ${resolveQueryCategoryName(
			parseInt(s, 10),
		)}. The settings in the current tab will be ignored. Do you want to proceed?`;

		Modal.confirm({
			title: t('title_confirm'),
			icon: <ExclamationCircleOutlined />,
			content: popupContent,
			onOk() {
				const selected = parseInt(s, 10);
				setQueryCategory(selected as QueryType);
				message.success(
					`Query format changed to ${resolveQueryCategoryName(parseInt(s, 10))}`,
				);
			},
			okText: t('button_ok'),
			cancelText: t('button_cancel'),
		});
	};

	const getNextQueryLabel = useCallback((): string => {
		const queryCount =
			Object.keys(metricQueries).length + Object.keys(formulaQueries).length;

		return String.fromCharCode(64 + queryCount + 1);
	}, [metricQueries, formulaQueries]);

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

	const renderAddons = (): JSX.Element => {
		return (
			<ButtonContainer>
				<QueryButton onClick={addMetricQuery} icon={<PlusOutlined />}>
					{t('button_query')}
				</QueryButton>
				<QueryButton onClick={addFormula} icon={<PlusOutlined />}>
					{t('button_formula')}
				</QueryButton>
			</ButtonContainer>
		);
	};

	const renderPromqlUI = (): JSX.Element => {
		return (
			<PromqlSection promQueries={promQueries} setPromQueries={setPromQueries} />
		);
	};

	const renderMetricUI = (): JSX.Element => {
		return (
			<QueryContainer>
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
								hideLegend
							/>
						);
					})}
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
			</QueryContainer>
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
						defaultActiveKey={QUERY_BUILDER.toString()}
						activeKey={queryCategory.toString()}
						onChange={handleQueryCategoryChange}
					>
						<TabPane tab={t('tab_qb')} key={QUERY_BUILDER.toString()} />
						<TabPane tab={t('tab_promql')} key={PROMQL.toString()} />
					</Tabs>
				</div>
				{queryCategory === PROMQL ? renderPromqlUI() : renderMetricUI()}
				{queryCategory !== PROMQL && renderAddons()}
			</FormContainer>
		</>
	);
}

interface QuerySectionProps {
	queryCategory: QueryType;
	setQueryCategory: (n: QueryType) => void;
	metricQueries: IMetricQueries;
	setMetricQueries: (b: IMetricQueries) => void;
	formulaQueries: IFormulaQueries;
	setFormulaQueries: (b: IFormulaQueries) => void;
	promQueries: IPromQueries;
	setPromQueries: (p: IPromQueries) => void;
	allowCategoryChange: boolean;
}

export default QuerySection;
