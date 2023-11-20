import { CloseCircleFilled } from '@ant-design/icons';
import { useMachine } from '@xstate/react';
import { Button, Select } from 'antd';
import { RefSelectProps } from 'antd/lib/select';
import history from 'lib/history';
import { filter, map } from 'lodash-es';
import {
	MutableRefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { v4 as uuidv4 } from 'uuid';

import { DashboardSearchAndFilter } from './Dashboard.machine';
import QueryChip from './QueryChip';
import { QueryChipItem, SearchContainer } from './styles';
import { IOptionsData, IQueryStructure, TCategory, TOperator } from './types';
import {
	convertQueriesToURLQuery,
	convertURLQueryStringToQuery,
	executeSearchQueries,
	OptionsSchemas,
	OptionsValueResolution,
} from './utils';

function SearchFilter({
	searchData,
	filterDashboards,
}: {
	searchData: Dashboard[];
	filterDashboards: (filteredDashboards: Dashboard[]) => void;
}): JSX.Element {
	const [category, setCategory] = useState<TCategory>();
	const [optionsData, setOptionsData] = useState<IOptionsData>(
		OptionsSchemas.attribute,
	);
	const selectRef = useRef() as MutableRefObject<RefSelectProps>;
	const [selectedValues, setSelectedValues] = useState<string[]>([]);
	const [staging, setStaging] = useState<string[] | string[][] | unknown[]>([]);
	const [queries, setQueries] = useState<IQueryStructure[]>([]);

	useEffect(() => {
		const searchQueryString = new URLSearchParams(history.location.search).get(
			'search',
		);
		if (searchQueryString)
			setQueries(convertURLQueryStringToQuery(searchQueryString) || []);
	}, []);
	useEffect(() => {
		filterDashboards(executeSearchQueries(queries, searchData));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queries, searchData]);

	const updateURLWithQuery = useCallback(
		(inputQueries?: IQueryStructure[]): void => {
			history.push({
				pathname: history.location.pathname,
				search:
					inputQueries || queries
						? `?search=${convertQueriesToURLQuery(inputQueries || queries)}`
						: '',
			});
		},
		[queries],
	);

	useEffect(() => {
		if (Array.isArray(queries) && queries.length > 0) {
			updateURLWithQuery();
		}
	}, [queries, updateURLWithQuery]);

	const [state, send] = useMachine(DashboardSearchAndFilter, {
		actions: {
			onSelectCategory: () => {
				setOptionsData(OptionsSchemas.attribute);
			},
			onSelectOperator: () => {
				setOptionsData(OptionsSchemas.operator);
			},
			onSelectValue: () => {
				setOptionsData(
					OptionsValueResolution(category as TCategory, searchData) as IOptionsData,
				);
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
						category: staging[0] as string,
						operator: staging[1] as TOperator,
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
			const updatedQueries = filter(queries, ({ id }) => id !== queryId);
			updateURLWithQuery(updatedQueries);
			return updatedQueries;
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
			setCategory(`${value}`.toLowerCase() as TCategory);
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

	return (
		<SearchContainer>
			<div>
				{map(queries, (query) => (
					<QueryChip key={query.id} queryData={query} onRemove={removeQueryById} />
				))}
				{map(staging, (value) => (
					<QueryChipItem key={JSON.stringify(value)}>
						{value as string}
					</QueryChipItem>
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
					mode={optionsData.mode as 'tags' | 'multiple'}
					style={{ flex: 1 }}
					onChange={handleChange}
					bordered={false}
					suffixIcon={null}
					value={selectedValues}
					onFocus={handleFocus}
					onBlur={handleBlur}
					showSearch
				>
					{optionsData.options &&
						Array.isArray(optionsData.options) &&
						optionsData.options.map(
							(optionItem): JSX.Element => (
								<Select.Option
									key={(optionItem.value as string) || (optionItem.name as string)}
									value={optionItem.value || optionItem.name}
								>
									{optionItem.name}
								</Select.Option>
							),
						)}
				</Select>
			)}
			{queries && queries.length > 0 && (
				<Button icon={<CloseCircleFilled />} type="text" onClick={clearQueries} />
			)}
		</SearchContainer>
	);
}

export default SearchFilter;
