import {
	CloseCircleFilled,
	CloseCircleOutlined,
	CloseOutlined,
	EditFilled,
	TagOutlined,
} from '@ant-design/icons';
import { useMachine } from '@xstate/react';
import { Button, Select, Tag } from 'antd';
import {
	filter,
	findIndex,
	flattenDeep,
	map,
	remove,
	uniq,
	uniqWith,
} from 'lodash-es';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { v4 as uuidv4 } from 'uuid';
import { createMachine } from 'xstate';

import { DashboardSearchAndFilter } from './Dashboard.machine';
import { QueryChipContainer, QueryChipItem, SearchContainer } from './styles';

type TSearchAndFilterState =
	| 'attribute_selection'
	| 'operator_selection'
	| 'value_selection';
type TSearchAndFilterStateObject = {
	NEXT: TSearchAndFilterState;
};
const StateSequence: TSearchAndFilterState[] = [
	'attribute_selection',
	'operator_selection',
	'value_selection',
];

const { Option } = Select;

function TextToIcon(text) {
	return <span>{text}</span>;
}
const OptionsSchemas = {
	attribute: {
		mode: null,
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
		mode: null,
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
	value: {
		options: [
			// {
			// 	name: 'X',
			// },
			// {
			// 	name: 'Y',
			// },
		],
	},
};

const resolveOperator = (result, operator): boolean => {
	if (operator === '!=') {
		return !result;
	}
	if (operator === '=') {
		return !!result;
	}
};
const executeSearchQueries = (queries = [], searchData = []) => {
	if (!searchData.length || !queries.length) {
		return searchData;
	}
	console.log('exec Query cont', queries, searchData);
	queries.forEach(({ category, operator, value }) => {
		category = `${category}`.toLowerCase();
		value = flattenDeep([value]);
		searchData = searchData.filter(({ data: searchPayload }) => {
			const searchSpace = flattenDeep([searchPayload[category]]).filter(Boolean);
			if (!searchSpace || !searchSpace.length)
				return resolveOperator(false, operator);
			try {
				for (const searchSpaceItem of searchSpace) {
					for (const queryValue of value) {
						if (searchSpaceItem.match(queryValue)) {
							return resolveOperator(true, operator);
						}
					}
				}
			} catch (error) {
				console.error(error);
			}
			return resolveOperator(false, operator);
		});
	});
	return searchData;
};

function QueryChip({ category, operator, value, id, onRemove }) {
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
	const selectRef = useRef();
	const [selectedValues, setSelectedValues] = useState([]);
	const [staging, setStaging] = useState([]);
	const [queries, setQueries] = useState([]);

	useEffect(() => {
		filterDashboards(executeSearchQueries(queries, searchData));
	}, [queries, searchData]);

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
	const nextState = () => {
		send('NEXT');
		// validateStaging();
		// const newSelectedCategory = stateTransition(StateSequence, selectedCategory);
		// if (!newSelectedCategory) return;

		// switch (newSelectedCategory as TSearchAndFilterState) {
		// 	case 'attribute_selection':
		// 		setOptionsData(OptionsSchemas.attribute);
		// 		break;
		// 	case 'operator_selection':
		// 		setOptionsData(OptionsSchemas.operator);
		// 		break;
		// 	case 'value_selection':
		// 		setOptionsData(OptionsSchemas.value);
		// 		break;
		// 	default:
		// 		setOptionsData(null);
		// }
		// setSelectedCategory(newSelectedCategory);
	};
	const removeQueryById = (queryId) => {
		setQueries((queries) => {
			return filter(queries, ({ id }) => id !== queryId);
		});
	};

	const handleChange = (value) => {
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
	const handleFocus = () => {
		if (state.value === 'Idle') {
			send('NEXT');
			selectRef.current?.focus();
		}
	};

	const handleBlur = () => {
		send('onBlur');
		selectRef.current.blur();
	};

	const optionsChildren = map(optionsData?.options, (optionItem) => {
		const { name, value } = optionItem;
		return { label: name, value: value || name };
	});

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
					<QueryChip key={query.id} {...query} onRemove={removeQueryById} />
				))}
				{map(staging, (value) => (
					<QueryChipItem key={value}>{value}</QueryChipItem>
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
					// autoClearSearchValue
					value={selectedValues}
					options={optionsChildren}
					onFocus={handleFocus}
					onBlur={handleBlur}

				// open={selectOpen}
				/>
			)}
		</SearchContainer>
	);
}

export default SearchFilter;
