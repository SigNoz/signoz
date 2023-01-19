import { AutoComplete, Input, Space } from 'antd';
import getTagFilters from 'api/trace/getTagFilter';
import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { functions } from './config';
import { SelectComponent } from './styles';
import {
	functionValue,
	initOptions,
	onClickSelectedFunctionHandler,
	onClickSelectedGroupByHandler,
	selectedGroupByValue,
} from './utils';

const { Option } = SelectComponent;

function TraceGraphFilter(): JSX.Element {
	const { selectedFunction, selectedGroupBy } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { isLoading, data } = useQuery(
		['getTagKeys', globalTime.minTime, globalTime.maxTime, traces],
		{
			queryFn: () =>
				getTagFilters({
					start: globalTime.minTime,
					end: globalTime.maxTime,
					other: Object.fromEntries(traces.selectedFilter),
					isFilterExclude: traces.isFilterExclude,
				}),
		},
	);

	const options = useMemo(() => initOptions(data?.payload), [data?.payload]);

	return (
		<Space>
			<label htmlFor="selectedFunction">Function</label>

			<SelectComponent
				dropdownMatchSelectWidth
				data-testid="selectedFunction"
				id="selectedFunction"
				value={functionValue(selectedFunction)}
				onChange={onClickSelectedFunctionHandler(dispatch)}
			>
				{functions.map((value) => (
					<Option value={value.key} key={value.key}>
						{value.displayValue}
					</Option>
				))}
			</SelectComponent>

			<label htmlFor="selectedGroupBy">Group By</label>
			<AutoComplete
				dropdownMatchSelectWidth
				id="selectedGroupBy"
				data-testid="selectedGroupBy"
				options={options}
				value={selectedGroupByValue(selectedGroupBy)}
				onChange={onClickSelectedGroupByHandler(options, dispatch)}
			>
				<Input disabled={isLoading} placeholder="Please select" />
			</AutoComplete>
		</Space>
	);
}

export default TraceGraphFilter;
