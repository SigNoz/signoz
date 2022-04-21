import { CloseCircleFilled } from '@ant-design/icons';
import { useMachine } from '@xstate/react';
import { Button, Select } from 'antd';
import history from 'lib/history';
import { filter, flattenDeep, map, uniqWith } from 'lodash-es';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { v4 as uuidv4 } from 'uuid';

import { DashboardSearchAndFilter } from './Dashboard.machine';
import { QueryChipContainer, QueryChipItem, SearchContainer } from './styles';
import { IQueryStructure } from './types';
import {
	convertQueriesToURLQuery,
	convertURLQueryStringToQuery,
	executeSearchQueries,
} from './utils';

const OptionsSchemas = {
	attribute: {
		mode: undefined,
		options: [
			{
				name: 'Title',
			},
			{
				name: 'Description',
			},
			{
				name: 'Tags',
			},
		],
	},
	operator: {
		mode: undefined,
		options: [
			{
				value: '=',
				name: 'Equal',
			},
			{
				name: 'Not Equal',
				value: '!=',
			},
		],
	},
};

function QueryChip({ queryData, onRemove }): JSX.Element {
	const { category, operator, value, id } = queryData;
	return (
		<QueryChipContainer>
			<QueryChipItem>{category}</QueryChipItem>
			<QueryChipItem>{operator}</QueryChipItem>
			<QueryChipItem closable onClose={() => onRemove(id)}>
				{Array.isArray(value) ? value.join(', ') : null}
			</QueryChipItem>
		</QueryChipContainer>
	);
}

function OptionsValueResolution(category, searchData) {
	const OptionsValueSchema = {
		title: {
			mode: 'tags',
			options: uniqWith(
				map(searchData, (searchItem) => ({ name: searchItem.data.title })),
				(prev, next) => prev.name === next.name,
			),
		},
		description: {
			mode: 'tags',
			options: uniqWith(
				map(searchData, (searchItem) =>
					searchItem.data.description
						? {
							name: searchItem.data.description,
							value: searchItem.data.description,
						}
						: null,
				).filter(Boolean),
				(prev, next) => prev.name === next.name,
			),
		},
		tags: {
			mode: 'tags',
			options: uniqWith(
				map(
					flattenDeep(
						map(searchData, (searchItem) => searchItem.data.tags).filter(Boolean),
					),
					(tag) => ({ name: tag }),
				),
				(prev, next) => prev.name === next.name,
			),
		},
	};

	return OptionsValueSchema[category] || { mode: null, options: [] };
}
function SearchFilter({ searchData, filterDashboards }): JSX.Element {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const [category, setCategory] = useState('');
	const [optionsData, setOptionsData] = useState(OptionsSchemas.attribute);
	const selectRef: React.Ref<any> = useRef();
	const [selectedValues, setSelectedValues] = useState<string[]>([]);
	const [staging, setStaging] = useState<string[][]>([]);
	const [queries, setQueries] = useState<IQueryStructure[] | unknown[]>([]);

	useEffect(() => {
		const searchQueryString = new URLSearchParams(history.location.search).get(
			'search',
		);
		if (searchQueryString)
			setQueries(convertURLQueryStringToQuery(searchQueryString) || []);
	}, []);
	useEffect(() => {
		filterDashboards(executeSearchQueries(queries, searchData));
	}, [queries, searchData]);

	useEffect(() => {
		if (Array.isArray(queries) && queries.length > 0) {
			history.push({
				pathname: history.location.pathname,
				search: `?search=${convertQueriesToURLQuery(queries)}`,
			});
		}
	}, [queries]);

	const [state, send] = useMachine(DashboardSearchAndFilter, {
		actions: {
			onSelectCategory: () => {
				setOptionsData(OptionsSchemas.attribute);
			},
			onSelectOperator: () => {
				setOptionsData(OptionsSchemas.operator);
			},
			onSelectValue: () => {
				setOptionsData(OptionsValueResolution(category, searchData));
			},
			onBlurPurge: () => {
				setSelectedValues([]);
				setStaging([]);
			},
			onValidateQuery: () => {
				if (staging.length <= 2 && selectedValues.length === 0) {
					return;
				}
				setQueries([
					...queries,
					{
						id: uuidv4(),
						category: staging[0],
						operator: staging[1],
						value: selectedValues,
					},
				]);
			},
		},
	});

	const nextState = (): void => {
		send('NEXT');
	};

	const removeQueryById = (queryId: string): void => {
		setQueries((queries) => {
			return filter(queries, ({ id }) => id !== queryId);
		});
	};

	const handleChange = (value: never | string[]): void => {
		if (!value) {
			return;
		}
		if (optionsData.mode) {
			setSelectedValues(value.filter(Boolean));
			return;
		}
		setStaging([...staging, value]);

		if (state.value === 'Category') {
			setCategory(`${value}`.toLowerCase());
		}
		nextState();
		setSelectedValues([]);
	};
	const handleFocus = (): void => {
		if (state.value === 'Idle') {
			send('NEXT');
			selectRef.current?.focus();
		}
	};

	const handleBlur = (): void => {
		send('onBlur');
		selectRef?.current?.blur();
	};

	const clearQueries = (): void => {
		setQueries([]);
		history.push({
			pathname: history.location.pathname,
			search: ``,
		});
	};
	const optionsChildren = map(
		optionsData.options,
		(optionItem: { name: string; value?: string }) => {
			const { name, value } = optionItem;
			return { label: name, value: value || name };
		},
	).filter(Boolean);

	return (
		<SearchContainer isDarkMode={isDarkMode}>
			<div
				style={{
					maxWidth: '70%',
					display: 'flex',
					overflowX: 'auto',
				}}
			>
				{map(queries, (query) => (
					<QueryChip key={query.id} queryData={query} onRemove={removeQueryById} />
				))}
				{map(staging, (value) => (
					<QueryChipItem key={JSON.stringify(value)}>{value}</QueryChipItem>
				))}
			</div>
			{optionsData && (
				<Select
					placeholder={
						!queries.length &&
						!staging.length &&
						!selectedValues.length &&
						'Search or Filter results'
					}
					size="small"
					ref={selectRef}
					mode={optionsData.mode}
					style={{ flex: 1 }}
					onChange={handleChange}
					bordered={false}
					suffixIcon={null}
					value={selectedValues}
					options={optionsChildren}
					onFocus={handleFocus}
					onBlur={handleBlur}
				/>
			)}
			{queries && queries.length > 0 && (
				<Button icon={<CloseCircleFilled />} type="text" onClick={clearQueries} />
			)}
		</SearchContainer>
	);
}

export default SearchFilter;
