import {
	DeleteOutlined,
	DownOutlined,
	EyeFilled,
	RightOutlined,
} from '@ant-design/icons';
import { Button, Col, Divider, Input, Row, Select, Spin, Tabs } from 'antd';
import { getMetricName } from 'api/metrics/getMetricName';
import MonacoEditor from 'components/Editor';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { v4 as uuid } from 'uuid';

import { InputContainer, QueryBuilderWrapper, QueryWrapper } from '../styles';
import { TQueryCategories } from '../types';
import MetricTagKeyFilter from './MetricTagKeyFilter';
import { GetTagKeys } from './MetricTagKeyFilter/utils';
import { AggregateFunctions } from './Options';
import PromQLQueryBuilder from './promQL';

const { Option } = Select;
function MetricsBuilder({
	queryData,
	updateQueryData,

}: QueryBuilderProps): JSX.Element {
	const [groupByOptions, setGroupByOptions] = useState([]);
	const [metricName, setMetricName] = useState(
		queryData.queryBuilder.metricName,
	);
	const handleQueryBuilderChange = ({
		aggregateFunction,
		metricName,
		tagFilters,
		groupBy,
	}) => {
		if (aggregateFunction !== undefined) {
			queryData.queryBuilder.aggregateOperator = aggregateFunction;
		}

		if (metricName) {
			queryData.queryBuilder.metricName = metricName;
		}

		if (tagFilters) {
			queryData.queryBuilder.tagFilters.items = tagFilters;
		}
		if (groupBy) {
			queryData.queryBuilder.groupBy = groupBy;
		}

		updateQueryData(queryData);
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

	useEffect(() => {
		GetTagKeys(metricName).then((tagKeys) => {
			setGroupByOptions(
				tagKeys
			)
		})
	}, [metricName]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
			<div>
				<Select
					onChange={(e) => handleQueryBuilderChange({ aggregateFunction: e })}
					defaultValue={
						queryData.queryBuilder.aggregateOperator || AggregateFunctions[0]
					}
					style={{ minWidth: 120 }}
					options={AggregateFunctions}
				/>
			</div>
			<Row>
				<div style={{ flex: 1 }}>
					<Select
						defaultValue="metrics"
						showArrow={false}
						dropdownStyle={{ display: 'none' }}
					>
						<Option value="metrics">Metrics</Option>
					</Select>

					<Select
						showSearch
						placeholder="Metric Name (Start typing to get suggestions)"
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
						onChange={(e) => {
							handleQueryBuilderChange({ metricName: e });
							setMetricName(e);
						}}
					/>
				</div>
				<Col style={{ flex: 1 }}>
					<Row>
						<Select
							defaultValue="WHERE"
							showArrow={false}
							dropdownStyle={{ display: 'none' }}
						>
							<Option value="WHERE">WHERE</Option>
						</Select>
						<MetricTagKeyFilter
							metricName={metricName}
							selectedTagFilters={queryData.queryBuilder.tagFilters.items}
							onSetQuery={(updatedTagFilters) =>
								handleQueryBuilderChange({ tagFilters: updatedTagFilters })
							}
						/>
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
							mode="multiple"
							showSearch
							style={{ flex: 1 }}
							defaultActiveFirstOption={false}
							filterOption={false}
							notFoundContent={metricNameLoading ? <Spin size="small" /> : null}
							options={groupByOptions}
							defaultValue={queryData.queryBuilder.groupBy}
							onChange={(e) => {
								handleQueryBuilderChange({ groupBy: e });
							}}
						/>
					</Row>
				</Col>
			</Row>
		</div>
	);
}

interface QueryBuilderProps {
	queryCategory: TQueryCategories;
}
export default MetricsBuilder;
