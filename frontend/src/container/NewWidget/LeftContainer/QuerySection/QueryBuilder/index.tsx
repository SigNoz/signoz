import {
	DeleteOutlined,
	DownOutlined,
	EyeFilled,
	RightOutlined,
} from '@ant-design/icons';
import { Button, Row } from 'antd';
import MonacoEditor from 'components/Editor';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { QueryBuilderWrapper, QueryWrapper } from '../styles';
import { TQueryCategories } from '../types';
import PromQLQueryBuilder from './promQL/promQL';
import MetricsBuilder from './queryBuilder/query';

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
	const handleClickhouseQueryChange = (clickHouseQuery): void => {
		if (clickHouseQuery !== null) {
			queryData.clickHouseQuery = clickHouseQuery;
		}
		updateQueryData(queryData);
	};
	const handlePromQLQueryChange = ({ query, legend }): void => {
		if (query) queryData.promQL.query = query;
		if (legend) queryData.promQL.legend = legend;

		updateQueryData(queryData);
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
							metricName={queryData.queryBuilder.metricName}
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
	queryCategory: TQueryCategories;
	name: string;
}
export default QueryBuilder;
