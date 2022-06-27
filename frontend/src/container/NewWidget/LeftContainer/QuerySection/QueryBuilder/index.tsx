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
import MetricsBuilder from './metricsBuilder';
import MetricTagKeyFilter from './MetricTagKeyFilter';
import { AggregateFunctions } from './Options';
import PromQLQueryBuilder from './promQL';

const { Option } = Select;
function QueryBuilder({
	name,
	onDelete,
	queryCategory,
	queryData,
	updateQueryData,
}: QueryBuilderProps): JSX.Element {
	const [metricName, setMetricName] = useState(
		queryData.queryBuilder.metricName,
	);
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const [hideFromUI, setHideFromUI] = useState<boolean>(false);
	const handleHideFromUI = (): void => {
		setHideFromUI(!hideFromUI);
	};
	const handleQueryBuilderChange = ({
		aggregateFunction,
		metricName,
		tagFilters,
	}) => {
		if (aggregateFunction) {
			queryData.queryBuilder.aggregateOperator = aggregateFunction;
		}

		if (metricName) {
			queryData.queryBuilder.metricName = metricName;
		}

		if (tagFilters) {
			queryData.queryBuilder.tagFilters.items = tagFilters;
		}

		updateQueryData(queryData);
	};
	const handleClickhouseQueryChange = (clickHouseQuery) => {
		if (clickHouseQuery !== null) {
			queryData.clickHouseQuery = clickHouseQuery;
		}
		updateQueryData(queryData);
	};
	const handlePromQLQueryChange = ({ query, legend }) => {
		if (query) queryData.promQL.query = query;
		if (legend) queryData.promQL.legend = legend;

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
					{queryCategory === 0 ? (
						<MetricsBuilder
							queryData={queryData}
							updateQueryData={updateQueryData}
							metricName={metricName}
						/>
					) : queryCategory === 1 ? (
						<MonacoEditor
							language="sql"
							theme="vs-dark"
							height="200px"
							onChange={handleClickhouseQueryChange}
							value={queryData.clickHouseQuery}
							// options={options}
						/>
					) : queryCategory === 2 ? (
						<PromQLQueryBuilder
							query={queryData.promQL.query}
							onQueryChange={(value) => handlePromQLQueryChange({ query: value })}
							legend={queryData.promQL.legend}
							onLegendChange={(value) => handlePromQLQueryChange({ legend: value })}
						/>
					) : null}
				</QueryBuilderWrapper>
			)}
		</QueryWrapper>
	);
}

interface QueryBuilderProps {
	queryCategory: 0 | 1 | 2;
}
export default QueryBuilder;
