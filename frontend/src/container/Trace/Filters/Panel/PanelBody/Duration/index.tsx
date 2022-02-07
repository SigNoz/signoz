import React, { useState } from 'react';

import { Input, Slider } from 'antd';
import { Container, InputContainer, Text } from './styles';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { getFilter, updateURL } from 'store/actions/trace/util';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import getFilters from 'api/trace/getFilters';
import { GlobalReducer } from 'types/reducer/globalTime';

dayjs.extend(durationPlugin);

const getMs = (value: string) => {
	return dayjs
		.duration({
			milliseconds: parseInt(value, 10) / 1000000,
		})
		.format('SSS');
};

const Duration = (): JSX.Element => {
	const {
		filter,
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

	const getDuration = () => {
		const selectedDuration = selectedFilter.get('duration');

		if (selectedDuration) {
			return {
				maxDuration: selectedDuration[0],
				minDuration: selectedDuration[1],
			};
		}

		return filter.get('duration') || {};
	};

	const duration = getDuration();

	const maxDuration = duration['maxDuration'] || '0';
	const minDuration = duration['minDuration'] || '0';

	const [localMax, setLocalMax] = useState<string>(maxDuration);
	const [localMin, setLocalMin] = useState<string>(minDuration);

	const defaultValue = [parseFloat(minDuration), parseFloat(maxDuration)];

	const updatedUrl = async (
		min: number,
		max: number,
		selectedFilter: TraceReducer['selectedFilter'],
		spansAggregate: TraceReducer['spansAggregate'],
		filter: TraceReducer['filter'],
		filterToFetchData: TraceReducer['filterToFetchData'],
		selectedTags: TraceReducer['selectedTags'],
		globalTime: GlobalReducer,
		isFilterExclude: TraceReducer['isFilterExclude'],
	) => {
		const newMap = new Map(selectedFilter);
		newMap.set('duration', [String(max), String(min)]);

		const response = await getFilters({
			end: String(globalTime.maxTime),
			getFilters: filterToFetchData,
			other: Object.fromEntries(newMap),
			start: String(globalTime.minTime),
			isFilterExclude,
		});

		if (response.statusCode === 200) {
			const preFilter = getFilter(response.payload);

			dispatch({
				type: UPDATE_ALL_FILTERS,
				payload: {
					current: spansAggregate.currentPage,
					filter: preFilter,
					filterToFetchData,
					selectedFilter: newMap,
					selectedTags,
					userSelected: userSelectedFilter,
					isFilterExclude,
				},
			});

			updateURL(
				newMap,
				filterToFetchData,
				spansAggregate.currentPage,
				selectedTags,
				preFilter,
				isFilterExclude,
				userSelectedFilter,
			);
		}
	};

	const debounceUpdateUrl = useDebouncedFn(
		(
			min,
			max,
			selectedFilter,
			spansAggregate,
			filter,
			filterToFetchData,
			selectedTags,
			isFilterExclude,
		) =>
			updatedUrl(
				min,
				max,
				selectedFilter,
				spansAggregate,
				filter,
				filterToFetchData,
				selectedTags,
				globalTime,
				isFilterExclude,
			),
		500,
	);

	const onRangeSliderHandler = (number: [number, number]) => {
		const [min, max] = number;

		setLocalMin(min.toString());
		setLocalMax(max.toString());
	};

	return (
		<div>
			<Container>
				<InputContainer>
					<Text>Min</Text>
				</InputContainer>
				<Input
					addonAfter="ms"
					onChange={(event) => {
						const value = event.target.value;
						const min = parseFloat(value) * 1000000;
						const max = parseFloat(localMax);
						onRangeSliderHandler([min, max]);
						debounceUpdateUrl(
							min,
							max,
							selectedFilter,
							spansAggregate,
							filter,
							filterToFetchData,
							selectedTags,
							isFilterExclude,
						);
					}}
					value={getMs(localMin)}
				/>

				<InputContainer>
					<Text>Max</Text>
				</InputContainer>
				<Input
					addonAfter="ms"
					onChange={(event) => {
						const value = event.target.value;
						const min = parseFloat(localMin);
						const max = parseFloat(value) * 1000000;

						onRangeSliderHandler([min, max]);
						debounceUpdateUrl(
							min,
							max,
							selectedFilter,
							spansAggregate,
							filter,
							filterToFetchData,
							selectedTags,
							isFilterExclude,
						);
					}}
					value={getMs(localMax)}
				/>
			</Container>

			<Container>
				<Slider
					defaultValue={[defaultValue[0], defaultValue[1]]}
					min={parseFloat((filter.get('duration') || {})['minDuration'])}
					max={parseFloat((filter.get('duration') || {})['maxDuration'])}
					range
					tipFormatter={(value) => {
						if (value === undefined) {
							return '';
						}
						return <div>{`${getMs(value.toString())}ms`}</div>;
					}}
					onChange={onRangeSliderHandler}
					onAfterChange={([min, max]) => {
						debounceUpdateUrl(
							min,
							max,
							selectedFilter,
							spansAggregate,
							filter,
							filterToFetchData,
							selectedTags,
							isFilterExclude,
						);
					}}
					value={[parseFloat(localMin), parseFloat(localMax)]}
				/>
			</Container>
		</div>
	);
};

export default Duration;
