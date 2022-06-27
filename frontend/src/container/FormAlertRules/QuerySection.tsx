import { PlusOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
import QueryBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder';
import GetQueryName from 'container/NewWidget/LeftContainer/QuerySection/utils/GetQueryName';
import { cloneDeep } from 'lodash-es';
import React, { memo } from 'react';

import { QueryButton, QueryContainer, StepHeading } from './styles';
import { baseQuery, Query, QueryType } from './types';

const { TabPane } = Tabs;
function QuerySection({
	queryCategory,
	setQueryCategory,
	queryList,
	setQueryList,

	selectedGraph,
	selectedTime,
	yAxisUnit,
}: QuerySectionProps): JSX.Element {
	const handleQueryCategoryChange = (n: string): void => {
		const selected = parseInt(n, 10);
		setQueryCategory(selected as QueryType);
	};

	const handleQueryUpdate = ({ currentIndex, updatedQuery }): void => {
		setQueryList((prevState) => {
			prevState[currentIndex] = cloneDeep(updatedQuery);
			return prevState;
		});
	};

	const getNextQueryLabel = (): string | null | undefined => {
		return GetQueryName(queryList);
	};

	const queryOnClickHandler = (e): void => {
		e.preventDefault();
		const q = {
			...baseQuery,
			name: getNextQueryLabel(),
		};
		const qList = [...queryList, q];
		setQueryList(qList);
	};

	const handleDeleteQuery = ({ currentIndex }) => {
		setQueryList((prevState) => {
			prevState.splice(currentIndex, 1);
			return [...prevState];
		});
	};

	const renderAddons = () => {
		return (
			<>
				<QueryButton onClick={queryOnClickHandler} icon={<PlusOutlined />}>
					Query
				</QueryButton>
				<QueryButton onClick={queryOnClickHandler} icon={<PlusOutlined />}>
					Formula
				</QueryButton>
			</>
		);
	};
	return (
		<>
			<StepHeading> Step 1 - Define the metric</StepHeading>
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
			<QueryContainer>
				{queryList &&
					queryList.map((e, index) => (
						<QueryBuilder
							key={`${JSON.stringify(e)}`}
							name={e.name}
							updateQueryData={(updatedQuery: any): void =>
								handleQueryUpdate({ currentIndex: index, updatedQuery })
							}
							onDelete={(): void => handleDeleteQuery({ currentIndex: index })}
							queryData={e}
							queryCategory={queryCategory}
						/>
					))}
			</QueryContainer>
			{queryCategory !== 2 && renderAddons()}
		</>
	);
}

interface QuerySectionProps {
	queryCategory: QueryType;
	setQueryCategory: (n: QueryType) => void;
	queryList: Array<Query>;
	setQueryList: (a: Array<Query>) => void;
	// selectedTime: timePreferance;
	// selectedGraph: GRAPH_TYPES;
	// yAxisUnit: Widgets['yAxisUnit'];
}

export default QuerySection;
