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

import {
	InputContainer,
	QueryBuilderWrapper,
	QueryWrapper,
} from '../../styles';
import { TQueryCategories } from '../../types';
import { AggregateFunctions } from '../Options';
import QueryHeader from '../QueryHeader';
import MetricTagKeyFilter from './MetricTagKeyFilter';
import { GetTagKeys } from './MetricTagKeyFilter/utils';

const { Option } = Select;
function MetricsBuilder({
	queryData,
	queryIndex,
	handleQueryChange,
}: QueryBuilderProps): JSX.Element {
	const [groupByOptions, setGroupByOptions] = useState([]);
	const [metricName, setMetricName] = useState(queryData.metricName);

	const [metricNameList, setMetricNameList] = useState([]);
	const [metricNameLoading, setMetricNameLoading] = useState(false);
	const handleMetricNameSearch = async (searchQuery = '') => {
		console.log(searchQuery);
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
			setGroupByOptions(tagKeys);
		});
	}, [metricName]);

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
						onChange={(e) => handleQueryChange({ queryIndex, aggregateFunction: e })}
						defaultValue={queryData.aggregateOperator || AggregateFunctions[0]}
						style={{ minWidth: 120 }}
						options={AggregateFunctions}
					/>
				</div>
				<Row style={{ gap: '3%',margin:'0.5rem 0' }}>
					<Row style={{ flex: 2, gap: '3%' }}>
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
							onSelect={(e) => {
								handleQueryChange({ queryIndex, metricName: e });
								setMetricName(e);
							}}
						/>
					</Row>
					<Col style={{ flex: 3, }}>
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
								onSetQuery={(updatedTagFilters) =>
									handleQueryChange({ queryIndex, tagFilters: updatedTagFilters })
								}
							/>
						</Row>
						<Row style={{ gap: '3%', marginBottom: '1rem' }}>
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
								onChange={(e) => {
									handleQueryChange({ queryIndex, groupBy: e });
								}}
							/>
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

interface QueryBuilderProps {
	queryCategory: TQueryCategories;
}
export default MetricsBuilder;
