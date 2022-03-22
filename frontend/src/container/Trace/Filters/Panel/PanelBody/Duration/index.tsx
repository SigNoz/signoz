import { Input, Slider } from 'antd';
import { SliderRangeProps } from 'antd/lib/slider';
import getFilters from 'api/trace/getFilters';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { getFilter, updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { Container, InputContainer, Text } from './styles';

dayjs.extend(durationPlugin);

const getMs = (value: string) => {
	return dayjs
		.duration({
			milliseconds: parseInt(value, 10) / 1000000,
		})
		.format('SSS');
};

function Duration(): JSX.Element {
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

	const maxDuration = duration.maxDuration || '0';
	const minDuration = duration.minDuration || '0';

	const [localMax, setLocalMax] = useState<string>(maxDuration);
	const [localMin, setLocalMin] = useState<string>(minDuration);

	const defaultValue = [parseFloat(minDuration), parseFloat(maxDuration)];

	const updatedUrl = async (min: number, max: number) => {
		const preSelectedFilter = new Map(selectedFilter);
		const preUserSelected = new Map(userSelectedFilter);

		preSelectedFilter.set('duration', [String(max), String(min)]);

		console.log('on the update Url');
		const response = await getFilters({
			end: String(globalTime.maxTime),
			getFilters: filterToFetchData,
			other: Object.fromEntries(preSelectedFilter),
			start: String(globalTime.minTime),
			isFilterExclude,
		});

		if (response.statusCode === 200) {
			const preFilter = getFilter(response.payload);

			preFilter.forEach((value, key) => {
				if (key !== 'duration') {
					preUserSelected.set(key, Object.keys(value));
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
				},
			});

			updateURL(
				preSelectedFilter,
				filterToFetchData,
				spansAggregate.currentPage,
				selectedTags,
				preFilter,
				isFilterExclude,
				userSelectedFilter,
			);
		}
	};

	const onRangeSliderHandler = (number: [number, number]) => {
		const [min, max] = number;

		setLocalMin(min.toString());
		setLocalMax(max.toString());
	};

	const debouncedFunction = useDebouncedFn(
		(min, max) => {
			console.log('debounce function');
			updatedUrl(min, max);
		},
		500,
		undefined,
		[],
	);

	const onChangeMaxHandler: React.ChangeEventHandler<HTMLInputElement> = (
		event,
	) => {
		const { value } = event.target;
		const min = parseFloat(localMin);
		const max = parseFloat(value) * 1000000;

		console.log('on change in max');

		onRangeSliderHandler([min, max]);
		debouncedFunction(min, max);
	};

	const onChangeMinHandler: React.ChangeEventHandler<HTMLInputElement> = (
		event,
	) => {
		const { value } = event.target;
		const min = parseFloat(value) * 1000000;
		const max = parseFloat(localMax);
		onRangeSliderHandler([min, max]);
		console.log('on change in min');
		debouncedFunction(min, max);
	};

	const onRangeHandler: SliderRangeProps['onChange'] = ([min, max]) => {
		updatedUrl(min, max);
	};

	return (
		<div>
			<Container>
				<InputContainer>
					<Text>Min</Text>
				</InputContainer>
				<Input
					addonAfter="ms"
					onChange={onChangeMinHandler}
					value={getMs(localMin)}
				/>

				<InputContainer>
					<Text>Max</Text>
				</InputContainer>
				<Input
					addonAfter="ms"
					onChange={onChangeMaxHandler}
					value={getMs(localMax)}
				/>
			</Container>

			<Container>
				<Slider
					defaultValue={[defaultValue[0], defaultValue[1]]}
					min={parseFloat((filter.get('duration') || {}).minDuration)}
					max={parseFloat((filter.get('duration') || {}).maxDuration)}
					range
					tipFormatter={(value) => {
						if (value === undefined) {
							return '';
						}
						return <div>{`${getMs(value.toString())}ms`}</div>;
					}}
					onChange={([min, max]) => {
						onRangeSliderHandler([min, max]);
					}}
					onAfterChange={onRangeHandler}
					// onAfterChange={([min, max]) => {
					// 	const returnFunction = debounce((min, max) => updatedUrl(min, max));

					// 	returnFunction(min, max);
					// }}
					value={[parseFloat(localMin), parseFloat(localMax)]}
				/>
			</Container>
		</div>
	);
}

export default Duration;
