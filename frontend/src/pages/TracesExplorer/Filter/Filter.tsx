/* eslint-disable react-hooks/exhaustive-deps */
import './Filter.styles.scss';

import { ArrowLeftOutlined, FilterOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { AllTraceFilterKeys, AllTraceFilterOptions } from './filterUtils';
import { Section } from './Section';

interface FilterProps {
	setOpen: Dispatch<SetStateAction<boolean>>;
}

export function Filter(props: FilterProps): JSX.Element {
	const { setOpen } = props;
	const [selectedFilters, setSelectedFilters] = useState<
		Record<AllTraceFilterKeys, { values: string[]; keys: BaseAutocompleteData }>
	>();

	const requiredItem = {
		items: [
			{
				id: 'd4d99370',
				key: {
					key: 'serviceName',
					dataType: DataTypes.String,
					type: 'tag',
					isColumn: true,
					isJSON: false,
					id: 'serviceName--string--tag--true',
				},
				op: 'IN',
				value: ['driver', 'frontend'],
			},
		],
	};
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const handleRun = useCallback((): void => {
		const preparedQuery: Query = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item) => ({
					...item,
					filters: {
						...item.filters,
						items: [...item.filters.items, ...requiredItem.items],
					},
				})),
			},
		};
		redirectWithQueryBuilderData(preparedQuery);
	}, [currentQuery, redirectWithQueryBuilderData, requiredItem.items]);
	console.log(selectedFilters);
	return (
		<>
			<Flex justify="space-between" align="center" className="filter-header">
				<div className="filter-title">
					<FilterOutlined />
					<Typography.Text>Filters</Typography.Text>
				</div>
				<Button onClick={(): void => setOpen(false)} className="arrow-icon">
					<ArrowLeftOutlined onClick={handleRun} />
				</Button>
			</Flex>
			<>
				{AllTraceFilterOptions.map((panelName) => (
					<Section
						key={panelName}
						panelName={panelName}
						setSelectedFilters={setSelectedFilters}
					/>
				))}
			</>
		</>
	);
}
