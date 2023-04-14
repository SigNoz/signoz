import { AutoComplete, Col, Input, Row, Select, Spin } from 'antd';
import { getMetricName } from 'api/metrics/getMetricName';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React, { useEffect, useState } from 'react';
import { IMetricsBuilderQuery } from 'types/api/dashboard/getAll';
import { EReduceOperator } from 'types/common/dashboard';

import { AggregateFunctions } from '../Options';
import QueryHeader from '../QueryHeader';
import MetricTagKeyFilter from './MetricTagKeyFilter';
import { IOption } from './MetricTagKeyFilter/types';
import { GetTagKeys } from './MetricTagKeyFilter/utils';
import { IQueryBuilderQueryHandleChange } from './types';

const { Option } = Select;

interface IMetricsBuilderProps {
	queryIndex: number | string;
	selectedGraph: GRAPH_TYPES;
	queryData: IMetricsBuilderQuery;
	handleQueryChange: (args: IQueryBuilderQueryHandleChange) => void;
}

function MetricsBuilder({
	queryIndex,
	selectedGraph,
	queryData,
	handleQueryChange,
}: IMetricsBuilderProps): JSX.Element {
	const [groupByOptions, setGroupByOptions] = useState<IOption[]>([]);
	const [metricName, setMetricName] = useState<string | null>(
		queryData.metricName,
	);

	const [metricNameList, setMetricNameList] = useState<string[]>([]);
	const [metricNameLoading, setMetricNameLoading] = useState(false);

	const handleMetricNameSelect = (e: string): void => {
		handleQueryChange({ queryIndex, metricName: e });
		setMetricName(e);
	};

	const handleMetricNameSearch = async (searchQuery = ''): Promise<void> => {
		handleMetricNameSelect(searchQuery);
		setMetricNameList([]);
		setMetricNameLoading(true);
		const { payload } = await getMetricName(searchQuery);
		setMetricNameLoading(false);
		if (!payload || !payload.data) {
			return;
		}
		setMetricNameList(payload.data);
	};
	const [aggregateFunctionList, setAggregateFunctionList] = useState(
		AggregateFunctions,
	);
	const handleAggregateFunctionsSearch = (searchQuery = ''): void => {
		setAggregateFunctionList(
			AggregateFunctions.filter(({ label }) =>
				label.includes(searchQuery.toUpperCase()),
			) || [],
		);
	};

	useEffect(() => {
		GetTagKeys(metricName || '').then((tagKeys) => {
			setGroupByOptions(tagKeys);
		});
	}, [metricName]);

	// TODO: rewrite to Form component from antd

	return (
		<QueryHeader
			name={queryData.name}
			disabled={queryData.disabled}
			onDisable={(): void =>
				handleQueryChange({ queryIndex, toggleDisable: true })
			}
			onDelete={(): void => {
				handleQueryChange({ queryIndex, toggleDelete: true });
			}}
		>
			<div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
				<div>
					<Select
						onChange={(e): void =>
							handleQueryChange({ queryIndex, aggregateFunction: e })
						}
						defaultValue={queryData.aggregateOperator || AggregateFunctions[0]}
						style={{ minWidth: 150 }}
						options={aggregateFunctionList}
						showSearch
						onSearch={handleAggregateFunctionsSearch}
						filterOption={false}
					/>
				</div>
				<Row style={{ gap: '3%', margin: '0.5rem 0' }}>
					<Row style={{ flex: 2, gap: '3%' }}>
						<Select
							defaultValue="metrics"
							showArrow={false}
							dropdownStyle={{ display: 'none' }}
						>
							<Option value="metrics">Metrics</Option>
						</Select>

						<AutoComplete
							showSearch
							placeholder="Metric Name (Start typing to get suggestions)"
							style={{ flex: 1, minWidth: 200 }}
							showArrow={false}
							filterOption={false}
							onSearch={handleMetricNameSearch}
							notFoundContent={metricNameLoading ? <Spin size="small" /> : null}
							options={metricNameList.map((option) => ({
								label: option,
								value: option,
							}))}
							defaultValue={queryData.metricName}
							value={metricName}
							onSelect={handleMetricNameSelect}
						/>
					</Row>
					<Col style={{ flex: 3 }}>
						<Row style={{ gap: '3%', marginBottom: '1rem' }}>
							<Select
								defaultValue="WHERE"
								showArrow={false}
								dropdownStyle={{ display: 'none' }}
							>
								<Option value="WHERE">WHERE</Option>
							</Select>
							<MetricTagKeyFilter
								metricName={metricName}
								selectedTagFilters={queryData.tagFilters.items}
								onSetQuery={(
									updatedTagFilters: IMetricsBuilderQuery['tagFilters']['items'],
								): void =>
									handleQueryChange({ queryIndex, tagFilters: updatedTagFilters })
								}
							/>
						</Row>
						<Row style={{ gap: '3%', marginBottom: '1rem' }}>
							{selectedGraph === 'TIME_SERIES' ? (
								<>
									{' '}
									<Select
										defaultValue="GROUP BY"
										showArrow={false}
										dropdownStyle={{ display: 'none' }}
									>
										<Option value="GROUP BY">GROUP BY</Option>
									</Select>
									<Select
										mode="multiple"
										showSearch
										style={{ flex: 1 }}
										defaultActiveFirstOption={false}
										filterOption={false}
										notFoundContent={metricNameLoading ? <Spin size="small" /> : null}
										options={groupByOptions}
										defaultValue={queryData.groupBy}
										onChange={(e): void => {
											handleQueryChange({ queryIndex, groupBy: e });
										}}
									/>
								</>
							) : (
								<>
									<Select
										defaultValue="REDUCE TO"
										showArrow={false}
										dropdownStyle={{ display: 'none' }}
									>
										<Option value="GROUP BY">REDUCE TO</Option>
									</Select>
									<Select
										placeholder="Latest of values in timeframe"
										style={{ flex: 1 }}
										options={Object.keys(EReduceOperator)
											.filter((op) => !(parseInt(op, 10) >= 0))
											.map((op) => ({
												label: op,
												value: EReduceOperator[op as keyof typeof EReduceOperator],
											}))}
										defaultValue={
											EReduceOperator[
												(queryData.reduceTo as unknown) as keyof typeof EReduceOperator
											]
										}
										onChange={(e): void => {
											handleQueryChange({ queryIndex, reduceTo: e });
										}}
									/>
								</>
							)}
						</Row>
					</Col>
				</Row>
				<Row style={{ margin: '0.5rem 0' }}>
					<Input
						onChange={(e): void => {
							handleQueryChange({ queryIndex, legend: e.target.value });
						}}
						size="middle"
						defaultValue={queryData.legend}
						addonBefore="Legend Format"
					/>
				</Row>
			</div>
		</QueryHeader>
	);
}

export default MetricsBuilder;
