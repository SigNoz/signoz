import React, { useState } from 'react';

import { Input, Slider } from 'antd';
import { Container, InputContainer, Text } from './styles';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { updateURL } from 'store/actions/trace/util';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';

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
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const dispatch = useDispatch<Dispatch<AppActions>>();

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

	const defaultValue = [parseInt(minDuration, 10), parseInt(maxDuration, 10)];

	const updatedUrl = (
		min: number,
		max: number,
		selectedFilter: TraceReducer['selectedFilter'],
		spansAggregate: TraceReducer['spansAggregate'],
		filter: TraceReducer['filter'],
		filterToFetchData: TraceReducer['filterToFetchData'],
		selectedTags: TraceReducer['selectedTags'],
	) => {
		const newMap = new Map(selectedFilter);
		newMap.set('duration', [String(max), String(min)]);

		dispatch({
			type: UPDATE_ALL_FILTERS,
			payload: {
				current: spansAggregate.currentPage,
				filter,
				filterToFetchData,
				selectedFilter: newMap,
				selectedTags,
			},
		});

		updateURL(
			newMap,
			filterToFetchData,
			spansAggregate.currentPage,
			selectedTags,
			filter,
		);
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
		) =>
			updatedUrl(
				min,
				max,
				selectedFilter,
				spansAggregate,
				filter,
				filterToFetchData,
				selectedTags,
			),
		500,
	);

	const onRangeSliderHandler = (number: [number, number]) => {
		const [min, max] = number;

		setLocalMin(min.toString());
		setLocalMax(max.toString());

		debounceUpdateUrl(
			min,
			max,
			selectedFilter,
			spansAggregate,
			filter,
			filterToFetchData,
			selectedTags,
		);
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
						onRangeSliderHandler([parseFloat(value) * 1000000, parseFloat(localMax)]);
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
						onRangeSliderHandler([parseFloat(localMin), parseFloat(value) * 1000000]);
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
					value={[parseFloat(localMin), parseFloat(localMax)]}
				/>
			</Container>
		</div>
	);
};

export default Duration;
