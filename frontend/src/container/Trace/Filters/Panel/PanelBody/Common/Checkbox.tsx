import { Checkbox, Tooltip, Typography } from 'antd';
import getFilters from 'api/trace/getFilters';
import { AxiosError } from 'axios';
import { useNotifications } from 'hooks/useNotifications';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { getFilter, updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { CheckBoxContainer, ParaGraph } from './styles';

function CheckBoxComponent(props: CheckBoxProps): JSX.Element {
	const {
		selectedFilter,
		filterLoading,
		filterToFetchData,
		spansAggregate,
		selectedTags,
		filter,
		userSelectedFilter,
		isFilterExclude,
		spanKind,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { keyValue, name, value } = props;

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const [isLoading, setIsLoading] = useState<boolean>(false);

	const isUserSelected =
		(userSelectedFilter.get(name) || []).find((e) => e === keyValue) !==
		undefined;

	const { notifications } = useNotifications();

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const onCheckHandler = async (): Promise<void> => {
		try {
			setIsLoading(true);

			const newSelectedMap = new Map(selectedFilter);
			const preUserSelectedMap = new Map(userSelectedFilter);
			const preIsFilterExclude = new Map(isFilterExclude);

			const isTopicPresent = preUserSelectedMap.get(name);

			// append the value
			if (!isTopicPresent) {
				preUserSelectedMap.set(name, [keyValue]);
			} else {
				const isValuePresent =
					isTopicPresent.find((e) => e === keyValue) !== undefined;

				// check the value if present then remove the value or isChecked
				if (isValuePresent) {
					preUserSelectedMap.set(
						name,
						isTopicPresent.filter((e) => e !== keyValue),
					);
				} else {
					// if not present add into the array of string
					preUserSelectedMap.set(name, [...isTopicPresent, keyValue]);
				}
			}

			if (newSelectedMap.get(name)?.find((e) => e === keyValue)) {
				newSelectedMap.set(name, [
					...(newSelectedMap.get(name) || []).filter((e) => e !== keyValue),
				]);
			} else {
				newSelectedMap.set(name, [
					...new Set([...(newSelectedMap.get(name) || []), keyValue]),
				]);
			}

			if (preIsFilterExclude.get(name) !== false) {
				preIsFilterExclude.set(name, true);
			}

			const response = await getFilters({
				other: Object.fromEntries(newSelectedMap),
				end: String(globalTime.maxTime),
				start: String(globalTime.minTime),
				getFilters: filterToFetchData.filter((e) => e !== name),
				isFilterExclude: preIsFilterExclude,
				spanKind,
			});

			if (response.statusCode === 200) {
				const updatedFilter = getFilter(response.payload);

				// updatedFilter.forEach((value, key) => {
				// 	if (key !== 'duration' && name !== key) {
				// 		preUserSelectedMap.set(key, Object.keys(value));
				// 	}

				// 	if (key === 'duration') {
				// 		newSelectedMap.set('duration', [value.maxDuration, value.minDuration]);
				// 	}
				// });

				updatedFilter.set(name, {
					[`${keyValue}`]: '-1',
					...(filter.get(name) || {}),
					...(updatedFilter.get(name) || {}),
				});

				dispatch({
					type: UPDATE_ALL_FILTERS,
					payload: {
						selectedTags,
						current: spansAggregate.currentPage,
						filter: updatedFilter,
						filterToFetchData,
						selectedFilter: newSelectedMap,
						userSelected: preUserSelectedMap,
						isFilterExclude: preIsFilterExclude,
						order: spansAggregate.order,
						orderParam: spansAggregate.orderParam,
						pageSize: spansAggregate.pageSize,
						spanKind,
					},
				});

				setIsLoading(false);

				updateURL(
					newSelectedMap,
					filterToFetchData,
					spansAggregate.currentPage,
					selectedTags,
					preIsFilterExclude,
					preUserSelectedMap,
					spansAggregate.order,
					spansAggregate.pageSize,
					spansAggregate.orderParam,
				);
			} else {
				setIsLoading(false);

				notifications.error({
					message: response.error || 'Something went wrong',
				});
			}
		} catch (error) {
			notifications.error({
				message: (error as AxiosError).toString() || 'Something went wrong',
			});
			setIsLoading(false);
		}
	};

	const isCheckBoxSelected = isUserSelected;

	const TooTipOverLay = useMemo((): JSX.Element => <div>{keyValue}</div>, [
		keyValue,
	]);

	return (
		<CheckBoxContainer>
			<Checkbox
				disabled={isLoading || filterLoading}
				onClick={onCheckHandler}
				checked={isCheckBoxSelected}
				defaultChecked
				key={keyValue}
			>
				<Tooltip overlay={TooTipOverLay}>
					<ParaGraph ellipsis>{keyValue}</ParaGraph>
				</Tooltip>
			</Checkbox>
			{isCheckBoxSelected ? (
				<Typography>{value}</Typography>
			) : (
				<Typography>-</Typography>
			)}
		</CheckBoxContainer>
	);
}

interface CheckBoxProps {
	keyValue: string;
	name: TraceFilterEnum;
	value: string;
}

export default CheckBoxComponent;
