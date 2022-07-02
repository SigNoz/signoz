import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { message, Modal, notification, Tabs } from 'antd';
import MetricsBuilderFormula from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/formula';
import MetricsBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/query';
import React, { useCallback } from 'react';
import {
	BuilderQueries,
	FilterItem,
	PromQueries,
} from 'types/api/metrics/compositeQuery';

import PromqlSection from './PromqlSection';
import {
	ButtonContainer,
	FormContainer,
	QueryButton,
	QueryContainer,
	StepHeading,
} from './styles';
import {
	PROMQL,
	QUERY_BUILDER,
	QueryType,
	resolveQueryCategoryName,
} from './types';

const { TabPane } = Tabs;
function QuerySection({
	queryCategory,
	setQueryCategory,
	metricQueries,
	setMetricQueries,
	promQueries,
	setPromQueries,
	allowCategoryChange,
}: QuerySectionProps): JSX.Element {
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
			title: 'Confirm',
			icon: <ExclamationCircleOutlined />,
			content: popupContent,
			onOk() {
				const selected = parseInt(s, 10);
				setQueryCategory(selected as QueryType);
				message.success(
					`Query format changed to ${resolveQueryCategoryName(parseInt(s, 10))}`,
				);
			},
			okText: 'Yes',
			cancelText: 'No',
		});
	};

	const getNextQueryLabel = useCallback((): string => {
		if (Object.keys(metricQueries).length === 0) {
			return 'A';
		}

		if (Object.keys(metricQueries).length === 1) {
			return 'B';
		}
		if (Object.keys(metricQueries).length === 2) {
			return 'C';
		}
		if (Object.keys(metricQueries).length === 3) {
			return 'D';
		}

		return 'E';
	}, [metricQueries]);

	const handleFormulaChange = ({
		formulaIndex,
		expression,
		toggleDisable,
		toggleDelete,
	}: {
		formulaIndex: string;
		expression: string;
		toggleDisable: boolean;
		toggleDelete: boolean;
	}): void => {
		const allQueries = metricQueries;
		const current = allQueries[formulaIndex];
		if (expression) {
			current.expression = expression;
		}

		if (toggleDisable) {
			current.disabled = !current.disabled;
		}

		if (toggleDelete) {
			delete allQueries[formulaIndex];
		} else {
			allQueries[formulaIndex] = current;
		}

		setMetricQueries({
			...allQueries,
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
		reduceTo,
	}: {
		queryIndex: string;
		aggregateFunction: number | undefined;
		metricName: string;
		tagFilters: FilterItem[];
		groupBy: string[];
		legend: string;
		toggleDisable: boolean;
		toggleDelete: boolean;
		reduceTo: string[];
	}): void => {
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

		if (reduceTo) {
			current.reduceTo = reduceTo;
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
			queryName: queryLabel,
			metricName: 'signoz_latency_count',
			formulaOnly: false,
			aggregateOperator: undefined,
			tagFilters: {
				op: 'AND',
				items: [],
			},
			groupBy: [],
			expression: queryLabel,
		};
		setMetricQueries({ ...queries });
	}, [getNextQueryLabel, metricQueries, setMetricQueries]);

	const addFormula = useCallback(async () => {
		let formulaCount = 0;
		Object.keys(metricQueries).forEach((key) => {
			if (metricQueries[key].metricName === '' || metricQueries[key].formulaOnly) {
				formulaCount += 1;
			}
		});

		if (formulaCount > 0) {
			notification.error({
				message: 'Unable to add formula. You can create at max 1 formula',
			});
			return;
		}

		const queryLabel = getNextQueryLabel();

		const queries = metricQueries;
		queries[queryLabel] = {
			queryName: queryLabel,
			formulaOnly: true,
			expression: 'A',
		};
		console.log('queries:', queries);
		setMetricQueries({ ...queries });
	}, [getNextQueryLabel, metricQueries, setMetricQueries]);
	const renderAddons = (): JSX.Element => {
		return (
			<ButtonContainer>
				<QueryButton onClick={addMetricQuery} icon={<PlusOutlined />}>
					Query
				</QueryButton>
				<QueryButton onClick={addFormula} icon={<PlusOutlined />}>
					Formula
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
						current.queryName = key;
						current.name = key;

						if (current.metricName === '' || current.formulaOnly) {
							return (
								<MetricsBuilderFormula
									key={key}
									formulaIndex={key}
									formulaData={current}
									handleFormulaChange={handleFormulaChange}
								/>
							);
						}
						return (
							<MetricsBuilder
								key={key}
								queryIndex={key}
								queryData={current}
								selectedGraph="TIME_SERIES"
								handleQueryChange={handleMetricQueryChange}
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
						defaultActiveKey="1"
						activeKey={queryCategory.toString()}
						onChange={handleQueryCategoryChange}
					>
						<TabPane tab="Query Builder" key={QUERY_BUILDER.toString()} />
						<TabPane tab="PromQL" key={PROMQL.toString()} />
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
	metricQueries: BuilderQueries;
	setMetricQueries: (b: BuilderQueries) => void;
	promQueries: PromQueries;
	setPromQueries: (p: PromQueries) => void;
	allowCategoryChange: boolean;
}

export default QuerySection;
