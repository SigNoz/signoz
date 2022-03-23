import { Checkbox, notification, Typography } from 'antd';
import getFilters from 'api/trace/getFilters';
import { AxiosError } from 'axios';
import React, { useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { SelectedTraceFilter } from 'store/actions/trace/selectTraceFilter';
import { getFilter, updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { CheckBoxContainer } from './styles';

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
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const [isLoading, setIsLoading] = useState<boolean>(false);

	const isUserSelected =
		(userSelectedFilter.get(props.name) || []).find(
			(e) => e === props.keyValue,
		) !== undefined;

	const onCheckHandler = async () => {
		try {
			setIsLoading(true);

			const newSelectedMap = new Map(selectedFilter);
			const preUserSelectedMap = new Map(userSelectedFilter);
			const preIsFilterExclude = new Map(isFilterExclude);

			const isTopicPresent = preUserSelectedMap.get(props.name);

			// append the value
			if (!isTopicPresent) {
				preUserSelectedMap.set(props.name, [props.keyValue]);
			} else {
				const isValuePresent =
					isTopicPresent.find((e) => e === props.keyValue) !== undefined;

				// check the value if present then remove the value or isChecked
				if (isValuePresent) {
					preUserSelectedMap.set(
						props.name,
						isTopicPresent.filter((e) => e !== props.keyValue),
					);
				} else {
					// if not present add into the array of string
					preUserSelectedMap.set(props.name, [...isTopicPresent, props.keyValue]);
				}
			}

			if (newSelectedMap.get(props.name)?.find((e) => e === props.keyValue)) {
				newSelectedMap.set(props.name, [
					...(newSelectedMap.get(props.name) || []).filter(
						(e) => e !== props.keyValue,
					),
				]);
			} else {
				newSelectedMap.set(props.name, [
					...new Set([...(newSelectedMap.get(props.name) || []), props.keyValue]),
				]);
			}

			if (preIsFilterExclude.get(props.name) !== false) {
				preIsFilterExclude.set(props.name, true);
			}

			const response = await getFilters({
				other: Object.fromEntries(newSelectedMap),
				end: String(globalTime.maxTime),
				start: String(globalTime.minTime),
				getFilters: filterToFetchData.filter((e) => e !== props.name),
				isFilterExclude: preIsFilterExclude,
			});

			if (response.statusCode === 200) {
				const updatedFilter = getFilter(response.payload);

				updatedFilter.forEach((value, key) => {
					if (key !== 'duration' && props.name !== key) {
						preUserSelectedMap.set(key, Object.keys(value));
					}
				});

				updatedFilter.set(props.name, {
					[`${props.keyValue}`]: '-1',
					...(filter.get(props.name) || {}),
					...(updatedFilter.get(props.name) || {}),
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
					},
				});

				setIsLoading(false);

				updateURL(
					newSelectedMap,
					filterToFetchData,
					spansAggregate.currentPage,
					selectedTags,
					updatedFilter,
					preIsFilterExclude,
					preUserSelectedMap,
				);
			} else {
				setIsLoading(false);

				notification.error({
					message: response.error || 'Something went wrong',
				});
			}
		} catch (error) {
			notification.error({
				message: (error as AxiosError).toString() || 'Something went wrong',
			});
			setIsLoading(false);
		}
	};

	const isCheckBoxSelected = isUserSelected;

	return (
		<CheckBoxContainer>
			<Checkbox
				disabled={isLoading || filterLoading}
				onClick={onCheckHandler}
				checked={isCheckBoxSelected}
				defaultChecked
				key={props.keyValue}
			>
				{props.keyValue}
			</Checkbox>
			{isCheckBoxSelected ? (
				<Typography>{props.value}</Typography>
			) : (
				<Typography>-</Typography>
			)}
		</CheckBoxContainer>
	);
}

interface DispatchProps {
	selectedTraceFilter: (props: {
		topic: TraceFilterEnum;
		value: string;
	}) => void;
}

interface CheckBoxProps extends DispatchProps {
	keyValue: string;
	value: string;
	name: TraceFilterEnum;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	selectedTraceFilter: bindActionCreators(SelectedTraceFilter, dispatch),
});

export default connect(null, mapDispatchToProps)(CheckBoxComponent);
