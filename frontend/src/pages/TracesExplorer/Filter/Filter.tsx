/* eslint-disable react-hooks/exhaustive-deps */
import './Filter.styles.scss';

import { ArrowLeftOutlined, FilterOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

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

	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const preparePostData = (): TagFilterItem[] => {
		console.log(selectedFilters);

		if (!selectedFilters) {
			return [];
		}
		const items = Object.keys(selectedFilters)?.flatMap((attribute) => {
			const { keys, values } = selectedFilters[attribute as AllTraceFilterKeys];
			if ((attribute as AllTraceFilterKeys) === 'durationNano') {
				if (!values.length) {
					return [];
				}
				const minValue = values[0];
				const maxValue = values[1];

				const minItems: TagFilterItem = {
					id: uuid().slice(0, 8),
					op: '>=',
					key: keys,
					value: parseInt(minValue, 10) * 1000000,
				};

				const maxItems: TagFilterItem = {
					id: uuid().slice(0, 8),
					op: '<=',
					key: keys,
					value: parseInt(maxValue, 10) * 1000000,
				};

				return maxValue ? [minItems, maxItems] : [minItems];
			}
			return {
				id: uuid().slice(0, 8),
				key: keys,
				op: 'IN',
				value: values,
			};
		});

		return items as TagFilterItem[];
	};

	const handleRun = useCallback((): void => {
		const preparedQuery: Query = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item) => ({
					...item,
					filters: {
						...item.filters,
						items: preparePostData(),
					},
				})),
			},
		};
		redirectWithQueryBuilderData(preparedQuery);
	}, [currentQuery, redirectWithQueryBuilderData]);

	useEffect(() => {
		handleRun();
	}, [selectedFilters]);

	return (
		<>
			<Flex justify="space-between" align="center" className="filter-header">
				<div className="filter-title">
					<FilterOutlined />
					<Typography.Text>Filters</Typography.Text>
				</div>
				<Button onClick={(): void => setOpen(false)} className="arrow-icon">
					<ArrowLeftOutlined />
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
