import { Input, notification } from 'antd';
const { Search } = Input;
import { AxiosError } from 'axios';

import getFilters from 'api/trace/getFilters';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { getFilter, updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

function TraceID(): JSX.Element {
	const {
		selectedFilter,
		filterToFetchData,
		spansAggregate,
		selectedTags,
		userSelectedFilter,
		isFilterExclude,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [userEnteredValue, setUserEnteredValue] = useState<string>('');
	useEffect(() => {
		setUserEnteredValue(selectedFilter.get('traceID')?.[0] || '');
	}, [selectedFilter]);
	const onSearch = async (value: string): Promise<void> => {
		try {
			setIsLoading(true);
			const preSelectedFilter = new Map(selectedFilter);
			if (value !== '') {
				preSelectedFilter.set('traceID', [value]);
			} else {
				preSelectedFilter.delete('traceID');
			}
			const preUserSelected = new Map(userSelectedFilter);
			const response = await getFilters({
				other: Object.fromEntries(preSelectedFilter),
				end: String(globalTime.maxTime),
				start: String(globalTime.minTime),
				getFilters: filterToFetchData,
				isFilterExclude,
			});

			if (response.statusCode === 200) {
				const preFilter = getFilter(response.payload);

				preFilter.forEach((value, key) => {
					const values = Object.keys(value);
					if (key !== 'duration' && values.length) {
						preUserSelected.set(key, values);
					}
				});

				dispatch({
					type: UPDATE_ALL_FILTERS,
					payload: {
						current: spansAggregate.currentPage,
						filter: preFilter,
						filterToFetchData,
						selectedFilter: preSelectedFilter,
						selectedTags,
						userSelected: preUserSelected,
						isFilterExclude,
						order: spansAggregate.order,
						pageSize: spansAggregate.pageSize,
						orderParam: spansAggregate.orderParam,
					},
				});

				updateURL(
					preSelectedFilter,
					filterToFetchData,
					spansAggregate.currentPage,
					selectedTags,
					isFilterExclude,
					userSelectedFilter,
					spansAggregate.order,
					spansAggregate.pageSize,
					spansAggregate.orderParam,
				);
			}
		} catch (error) {
			notification.error({
				message: (error as AxiosError).toString() || 'Something went wrong',
			});
		}
		setIsLoading(false);
	};

	return (
		<div>
			<Search
				placeholder="Filter by Trace ID"
				onSearch={onSearch}
				style={{
					padding: '0 3%',
				}}
				loading={isLoading}
				value={userEnteredValue}
				onChange={(e) => setUserEnteredValue(e.target.value)}
			/>
		</div>
	);
}

export default TraceID;
