import React, { useState } from 'react';

import { Input, Slider } from 'antd';
import { Container, InputContainer, Text } from './styles';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { updateURL } from 'store/actions/trace/util';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';

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

	const maxDuration = duration['maxDuration'] || '';
	const minDuration = duration['minDuration'] || '';

	const [localMax, setLocalMax] = useState<string>(maxDuration);
	const [localMin, setLocalMin] = useState<string>(minDuration);

	const defaultValue = [parseInt(minDuration, 10), parseInt(maxDuration, 10)];

	const updatedUrl = (min: number, max: number) => {
		const newMap = new Map(selectedFilter);
		newMap.set('duration', [String(max), String(min)]);
		updateURL(
			newMap,
			filterToFetchData,
			spansAggregate.currentPage,
			selectedTags,
		);
	};

	const debounceUpdateUrl = useDebouncedFn(updatedUrl, 500);

	const onRangeSliderHandler = (number: [number, number]) => {
		const [min, max] = number;

		setLocalMin(min.toString());
		setLocalMax(max.toString());

		debounceUpdateUrl(min, max);
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
						onRangeSliderHandler([parseInt(value, 10), parseInt(localMin, 10)]);
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
						onRangeSliderHandler([parseInt(localMax, 10), parseInt(value, 10)]);
					}}
					value={getMs(localMax)}
				/>
			</Container>

			<Container>
				<Slider
					defaultValue={[defaultValue[0], defaultValue[1]]}
					min={parseInt((filter.get('duration') || {})['minDuration'], 10)}
					max={parseInt((filter.get('duration') || {})['maxDuration'], 10)}
					range
					tipFormatter={(value) => {
						if (value === undefined) {
							return '';
						}
						return <div>{`${getMs(value.toString())}ms`}</div>;
					}}
					onChange={onRangeSliderHandler}
					value={[parseInt(localMin, 10), parseInt(localMax, 10)]}
				/>
			</Container>
		</div>
	);
};

export default Duration;
