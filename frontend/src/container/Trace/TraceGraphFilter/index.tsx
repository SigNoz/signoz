import {
	AutoComplete,
	AutoCompleteProps,
	Input,
	notification,
	Space,
} from 'antd';
import getTagFilters from 'api/trace/getTagFilter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { extractTagFilters } from '../Search/AllTags/Tag/utils';
import { functions, groupBy } from './config';
import { SelectComponent } from './styles';

const { Option } = SelectComponent;

function TraceGraphFilter(): JSX.Element {
	const { selectedFunction, selectedGroupBy } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const [selectLoading, setSelectLoading] = useState<boolean>(false);
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);
	const [options, setOptions] = useState<AutoCompleteProps['options']>([]);

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
	function groupByValues(
		tagFilters: {
			value: string;
			label: string;
		}[],
	): {
		value: string;
		label: string;
	}[] {
		const result: { value: string; label: string }[] = tagFilters;
		groupBy.forEach((e) => {
			result.push({
				value: e.key,
				label: e.displayValue,
			});
		});
		return result;
	}
	const onSearchHandler = useCallback(async () => {
		try {
			setSelectLoading(true);
			const response = await getTagFilters({
				start: globalTime.minTime,
				end: globalTime.maxTime,
				other: Object.fromEntries(traces.selectedFilter),
				isFilterExclude: traces.isFilterExclude,
			});

			if (response.statusCode === 200) {
				if (response.payload === null) {
					setOptions(
						groupBy.map((e) => ({
							value: e.key,
							label: e.displayValue,
						})),
					);
				} else {
					setOptions(
						groupByValues(
							extractTagFilters(response.payload).map((e) => ({
								value: e,
								label: e,
							})),
						),
					);
				}
			} else {
				notification.error({
					message: response.error || 'Something went wrong',
				});
			}
			setSelectLoading(false);
		} catch (error) {
			notification.error({
				message: 'Something went wrong',
			});
			setSelectLoading(false);
		}
	}, [globalTime, traces]);

	const counter = useRef(0);

	useEffect(() => {
		if (counter.current === 0 && selectedGroupBy.length === 0) {
			counter.current = 1;
			onSearchHandler();
		}
	}, [onSearchHandler, selectedGroupBy]);
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
				value={groupBy.find((e) => selectedGroupBy === e.key)?.displayValue}
				onChange={onClickSelectedGroupByHandler}
			>
				<Input disabled={selectLoading} placeholder="Please select" />
			</AutoComplete>
		</Space>
	);
}

export default TraceGraphFilter;
