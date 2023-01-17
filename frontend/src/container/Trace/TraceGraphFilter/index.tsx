import { AutoComplete, Input, Space } from 'antd';
import getTagFilters from 'api/trace/getTagFilter';
import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_SELECTED_FUNCTION,
	UPDATE_SELECTED_GROUP_BY,
} from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { functions, groupBy } from './config';
import { SelectComponent } from './styles';
import { initOptions } from './utils';

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

	const onClickSelectedFunctionHandler = (ev: unknown): void => {
		if (typeof ev === 'string') {
			const selected = functions.find((e) => e.key === ev);
			if (selected) {
				dispatch({
					type: UPDATE_SELECTED_FUNCTION,
					payload: {
						selectedFunction: selected.key,
						yAxisUnit: selected.yAxisUnit,
					},
				});
			}
		}
	};

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

	const options = useMemo(() => initOptions(data), [data]);

	const onClickSelectedGroupByHandler = (ev: unknown): void => {
		if (typeof ev === 'string' && options) {
			const selected = options.find((e) => e.value === ev);
			if (selected) {
				dispatch({
					type: UPDATE_SELECTED_GROUP_BY,
					payload: {
						selectedGroupBy: selected.value ? selected.value.toString() : '',
					},
				});
			}
		}
	};

	return (
		<Space>
			<label htmlFor="selectedFunction">Function</label>

			<SelectComponent
				dropdownMatchSelectWidth
				data-testid="selectedFunction"
				id="selectedFunction"
				value={functions.find((e) => selectedFunction === e.key)?.displayValue}
				onChange={onClickSelectedFunctionHandler}
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
				value={groupBy.find((e) => selectedGroupBy === e.value)?.label}
				onChange={onClickSelectedGroupByHandler}
			>
				<Input disabled={isLoading} placeholder="Please select" />
			</AutoComplete>
		</Space>
	);
}

export default TraceGraphFilter;
