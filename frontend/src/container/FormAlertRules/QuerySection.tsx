import { PlusOutlined } from '@ant-design/icons';
import { notification } from 'antd';
import { Tabs } from 'antd';
import MetricsBuilderFormula from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/formula';
import MetricsBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/queryBuilder/query';
import React, { useCallback, useState } from 'react';
import { BuilderQueries, PromQueries } from 'types/api/metrics/compositeQuery';

import PromqlSection from './PromqlSection';
import {
	ButtonContainer,
	FormContainer,
	QueryButton,
	QueryContainer,
	StepHeading,
} from './styles';
import { QueryType } from './types';

const { TabPane } = Tabs;
function QuerySection({
	queryCategory,
	setQueryCategory,
	metricQueries,
	setMetricQueries,
	promQueries,
	setPromQueries,
	selectedGraph,
	selectedTime,
	yAxisUnit,
	allowCategoryChange,
}: QuerySectionProps): JSX.Element {
	const handleQueryCategoryChange = (n: string): void => {
		if (!allowCategoryChange) {
			notification.error({
				message:
					'Changes to query category are not allowed. Please create a new rule if the rule condition has changed.',
			});
			return;
		}
		const selected = parseInt(n, 10);
		setQueryCategory(selected as QueryType);
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
		legend,
		toggleDisable,
		toggleDelete,
		reduceTo,
	}): void => {
		const allQueries = metricQueries;
		const current = metricQueries[queryIndex];
		if (aggregateFunction) {
			current.aggregateOperator = aggregateFunction;
		}
		if (metricName) {
			current.metricName = metricName;
		}
		if (tagFilters) {
			current.tagFilters.items = tagFilters;
		}
		if (groupBy) {
			current.groupBy = groupBy;
		}

		if (reduceTo) {
			current.reduceTo = reduceTo;
		}

		if (legend !== undefined) {
			current.legend = legend;
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

	const addMetricQuery = useCallback(
		async (e) => {
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
				metricName: '',
				formulaOnly: false,
				aggregateOperator: undefined,
				tagFilters: {
					op: 'AND',
					items: [],
				},
				groupBy: [],
			};
			setMetricQueries({ ...queries });
		},
		[getNextQueryLabel, metricQueries, setMetricQueries],
	);

	const addFormula = useCallback(
		async (e) => {
			let formulaCount = 0;
			Object.keys(metricQueries).forEach((key) => {
				if (metricQueries[key].expression !== '') {
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

			setMetricQueries({ ...queries });
		},
		[getNextQueryLabel, metricQueries, setMetricQueries],
	);
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
						metricQueries[key].queryName = key;
						metricQueries[key].name = key;

						if (
							metricQueries[key].metricName === '' ||
							metricQueries[key].formulaOnly
						) {
							return (
								<MetricsBuilderFormula
									key={key}
									formulaIndex={key}
									formulaData={metricQueries[key]}
									handleFormulaChange={handleFormulaChange}
								/>
							);
						}
						return (
							<MetricsBuilder
								key={key}
								queryIndex={key}
								queryData={metricQueries[key]}
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
						defaultActiveKey="0"
						onChange={handleQueryCategoryChange}
					>
						<TabPane tab="Query Builder" key="0" />
						<TabPane tab="PromQL" key="2" />
					</Tabs>
				</div>
				{queryCategory === 2 ? renderPromqlUI() : renderMetricUI()}
				{queryCategory !== 2 && renderAddons()}
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
	// selectedTime: timePreferance;
	// selectedGraph: GRAPH_TYPES;
	// yAxisUnit: Widgets['yAxisUnit'];
	allowCategoryChange: boolean;
}

export default QuerySection;
