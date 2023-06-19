import { Input } from 'antd';
import getFilters from 'api/trace/getFilters';
import { AxiosError } from 'axios';
import { useNotifications } from 'hooks/useNotifications';
import { ChangeEvent, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { getFilter, updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

const { Search } = Input;

function TraceID(): JSX.Element {
	const {
		selectedFilter,
		filterToFetchData,
		spansAggregate,
		selectedTags,
		userSelectedFilter,
		isFilterExclude,
		spanKind,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [userEnteredValue, setUserEnteredValue] = useState<string>('');
	const { notifications } = useNotifications();
	useEffect(() => {
		setUserEnteredValue(selectedFilter.get('traceID')?.[0] || '');
	}, [selectedFilter]);
	const onSearch = async (value: string): Promise<void> => {
		try {
			setIsLoading(true);
			const preSelectedFilter = new Map(selectedFilter);
			const preUserSelected = new Map(userSelectedFilter);

			if (value !== '') {
				preUserSelected.set('traceID', [value]);
				preSelectedFilter.set('traceID', [value]);
			} else {
				preUserSelected.delete('traceID');
				preSelectedFilter.delete('traceID');
			}
			const response = await getFilters({
				other: Object.fromEntries(preSelectedFilter),
				end: String(globalTime.maxTime),
				start: String(globalTime.minTime),
				getFilters: filterToFetchData,
				isFilterExclude,
				spanKind,
			});

			if (response.statusCode === 200) {
				const preFilter = getFilter(response.payload);
				preFilter.set('traceID', { traceID: value });
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
						spanKind,
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
			notifications.error({
				message: (error as AxiosError).toString() || 'Something went wrong',
			});
		} finally {
			setIsLoading(false);
		}
	};
	const onChange = (e: ChangeEvent<HTMLInputElement>): void => {
		setUserEnteredValue(e.target.value);
	};
	const onBlur = (): void => {
		if (userEnteredValue !== selectedFilter.get('traceID')?.[0]) {
			onSearch(userEnteredValue);
		}
	};
	return (
		<div>
			<Search
				placeholder="Filter by Trace ID"
				onSearch={onSearch}
				style={{
					marginBottom: '5rem',
					padding: '0 3%',
				}}
				loading={isLoading}
				value={userEnteredValue}
				onChange={onChange}
				onBlur={onBlur}
			/>
		</div>
	);
}

export default TraceID;
