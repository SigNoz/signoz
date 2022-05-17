import {
	DeleteOutlined,
	DownOutlined,
	EyeFilled,
	RightOutlined,
} from '@ant-design/icons';
import { Button, Col, Divider, Input, Row, Select, Spin, Tabs } from 'antd';
import { getMetricName } from 'api/metrics/getMetricName';
import MonacoEditor from 'components/Editor';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { InputContainer, QueryBuilderWrapper, QueryWrapper } from '../styles';
import { TQueryCategories } from '../types';
import MetricTagKeyFilter from './MetricTagKeyFilter';
import { AggregateFunctions } from './Options';

const { Option } = Select;
const { TabPane } = Tabs;
function QueryBuilder({
	name,
	onDelete,
	queryCategory,
	queryData,
	updateQueryData,
}: QueryBuilderProps): JSX.Element {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const [hideFromUI, setHideFromUI] = useState<boolean>(false);
	const handleHideFromUI = (): void => {
		setHideFromUI(!hideFromUI);
	};
	const handleQueryBuilderChange = ({ aggregateFunction, metricName }) => {
		updateQueryData({
			...queryData,
			queryBuilder: {
				...queryData.queryBuilder,
				aggregateOperator:
					aggregateFunction || queryData.queryBuilder.aggregateFunction,
				metricName: metricName || queryData.queryBuilder.metricName,
			},
		});
	};
	const handleClickhouseQueryChange = (clickHouseQuery) => {
		updateQueryData({ ...queryData, clickHouseQuery });
	};
	const handlePromQLQueryChange = ({ query, legend }) => {
		updateQueryData({
			...queryData,
			promQL: {
				query: query || queryData.promQL.query,
				legend: legend || queryData.promQL.legend,
			},
		});
	};
	const [metricNameList, setMetricNameList] = useState([]);
	const [metricNameLoading, setMetricNameLoading] = useState(false);
	const handleMetricNameSearch = async (searchQuery = '') => {
		setMetricNameList([]);
		setMetricNameLoading(true);
		const { payload } = await getMetricName(searchQuery);
		setMetricNameLoading(false);
		if (!payload || !payload.data) {
			return;
		}
		setMetricNameList(payload.data);
	};
	return (
		<QueryWrapper>
			<Row style={{ justifyContent: 'space-between' }}>
				<Row>
					<Button type="ghost" icon={<EyeFilled />}>
						{name}
					</Button>
					<Button
						type="ghost"
						icon={hideFromUI ? <RightOutlined /> : <DownOutlined />}
						onClick={handleHideFromUI}
					/>
				</Row>

				<Button type="ghost" danger icon={<DeleteOutlined />} onClick={onDelete} />
			</Row>
			{!hideFromUI && (
				<QueryBuilderWrapper isDarkMode={isDarkMode}>
					{(queryCategory as TQueryCategories) === 'query_builder' ? (
						<div
							style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}
						>
							<div>
								<Select
									onChange={(e) => handleQueryBuilderChange({ aggregateFunction: e })}
									defaultValue={
										queryData.queryBuilder.aggregateOperator || AggregateFunctions[0]
									}
									style={{ minWidth: 120 }}
									options={AggregateFunctions.map((option) => ({
										label: option,
										value: option,
									}))}
								/>
							</div>
							<Row>
								<Select
									defaultValue="metrics"
									showArrow={false}
									dropdownStyle={{ display: 'none' }}
								>
									<Option value="metrics">Metrics</Option>
								</Select>

								<Select
									showSearch
									placeholder="Metric Name (system.cpu.time)"
									style={{ flex: 1 }}
									showArrow={false}
									filterOption={false}
									onSearch={handleMetricNameSearch}
									notFoundContent={metricNameLoading ? <Spin size="small" /> : null}
									options={metricNameList.map((option) => ({
										label: option,
										value: option,
									}))}
									defaultValue={queryData.queryBuilder.metricName}
									onChange={(e) => handleQueryBuilderChange({ metricName: e })}
								/>

								<Col style={{ flex: 1 }}>
									<Row>
										<Select
											defaultValue="WHERE"
											showArrow={false}
											dropdownStyle={{ display: 'none' }}
										>
											<Option value="WHERE">WHERE</Option>
										</Select>
										<MetricTagKeyFilter />
									</Row>
									<Row>
										<Select
											defaultValue="GROUP BY"
											showArrow={false}
											dropdownStyle={{ display: 'none' }}
										>
											<Option value="GROUP BY">GROUP BY</Option>
										</Select>
										<Select
											showSearch
											style={{ flex: 1 }}
											defaultActiveFirstOption={false}
											showArrow={false}
											filterOption={false}
											notFoundContent={null}
										>
											<Option value="jack">Jack</Option>
											<Option value="lucy">Lucy</Option>
											<Option value="disabled" disabled>
												Disabled
											</Option>
											<Option value="Yiminghe">yiminghe</Option>
										</Select>
									</Row>
								</Col>
							</Row>
						</div>
					) : queryCategory === 'clickhouse_query' ? (
						<MonacoEditor
							language="sql"
							theme="vs-dark"
							height="200px"
							onChange={handleClickhouseQueryChange}
							value={queryData.clickHouseQuery}
							// options={options}
						/>
					) : queryCategory === 'promql' ? (
						<>
							<InputContainer>
								<Input
									onChange={(event): void =>
										handlePromQLQueryChange({ query: event.target.value })
									}
									size="middle"
									defaultValue={queryData.promQL.query}
									addonBefore="PromQL Query"
									// onBlur={(): void => onBlurHandler()}
								/>
							</InputContainer>

							<InputContainer>
								<Input
									onChange={(event): void =>
										handlePromQLQueryChange({ legend: event.target.value })
									}
									size="middle"
									defaultValue={queryData.promQL.legend}
									addonBefore="Legend Format"
									// onBlur={(): void => onBlurHandler()}
								/>
							</InputContainer>
						</>
					) : null}
				</QueryBuilderWrapper>
			)}
		</QueryWrapper>
	);
}

interface QueryBuilderProps {
	queryCategory: TQueryCategories;
}
export default QueryBuilder;
