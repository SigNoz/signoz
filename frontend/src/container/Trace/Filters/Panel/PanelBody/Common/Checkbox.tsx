import React, { useState } from 'react';
import { CheckBoxContainer } from './styles';
import { Checkbox, notification, Typography } from 'antd';
import { connect, useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { SelectedTraceFilter } from 'store/actions/trace/selectTraceFilter';
import AppActions from 'types/actions';
import { ThunkDispatch } from 'redux-thunk';
import { bindActionCreators, Dispatch } from 'redux';
import { getFilter, updateURL } from 'store/actions/trace/util';
import getFilters from 'api/trace/getFilters';
import { AxiosError } from 'axios';
import { GlobalReducer } from 'types/reducer/globalTime';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';

const CheckBoxComponent = (props: CheckBoxProps): JSX.Element => {
	const {
		selectedFilter,
		filterLoading,
		filterToFetchData,
		spansAggregate,
		selectedTags,
		filter,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const [isLoading, setIsLoading] = useState<boolean>(false);

	const isPresent = selectedFilter.get(props.name) || [];

	const isSelected = isPresent.find((e) => e === props.keyValue) !== undefined;

	const onCheckHandler = async () => {
		try {
			setIsLoading(true);

			const newSelectedMap = new Map(selectedFilter);

			const isTopicPresent = newSelectedMap.get(props.name);

			// append the value
			if (!isTopicPresent) {
				newSelectedMap.set(props.name, [props.keyValue]);
			} else {
				const isValuePresent =
					isTopicPresent.find((e) => e === props.keyValue) !== undefined;

				// check the value if present then remove the value
				if (isValuePresent) {
					newSelectedMap.set(
						props.name,
						isTopicPresent.filter((e) => e !== props.keyValue),
					);
				} else {
					// if not present add into the array of string
					newSelectedMap.set(props.name, [...isTopicPresent, props.keyValue]);
				}
			}

			const mergedMaps = new Map([...selectedFilter, ...newSelectedMap]);

			const response = await getFilters({
				other: Object.fromEntries(mergedMaps),
				end: String(globalTime.maxTime),
				start: String(globalTime.minTime),
				getFilters: filterToFetchData,
			});

			if (response.statusCode === 200) {
				const updatedFilter = getFilter(response.payload);

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
						selectedFilter: mergedMaps,
					},
				});

				setIsLoading(false);

				updateURL(
					mergedMaps,
					filterToFetchData,
					spansAggregate.currentPage,
					selectedTags,
					updatedFilter,
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

	return (
		<CheckBoxContainer>
			<Checkbox
				disabled={isLoading || filterLoading}
				onClick={onCheckHandler}
				checked={isSelected}
				key={props.keyValue}
			>
				{props.keyValue}
			</Checkbox>
			{isSelected ? (
				<Typography
					style={{
						fontSize: '12px',
					}}
				>
					{props.value}
				</Typography>
			) : (
				<Typography
					style={{
						fontSize: '12px',
					}}
				>
					-
				</Typography>
			)}
		</CheckBoxContainer>
	);
};

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
