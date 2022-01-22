import React, { useState } from 'react';

import { Slider } from 'antd';
import { DurationText, InputComponent, TextCotainer, Text } from './styles';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { updateURL } from 'store/actions/trace/util';
import dayjs from 'dayjs';

const Duration = (): JSX.Element => {
	const {
		filter,
		selectedFilter,
		filterToFetchData,
		spansAggregate,
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
		updateURL(newMap, filterToFetchData, spansAggregate.currentPage);
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
			<DurationText>
				<TextCotainer>
					<Text>Min</Text>
					<InputComponent value={localMin} />
				</TextCotainer>

				<TextCotainer>
					<Text>Max</Text>
					<InputComponent
						onChange={(event) => {
							const value = event.target.value;
							onRangeSliderHandler([parseInt(localMax, 10), parseInt(value, 10)]);
						}}
						value={localMax}
					/>
				</TextCotainer>
			</DurationText>

			<Slider
				defaultValue={[defaultValue[0], defaultValue[1]]}
				min={parseInt((filter.get('duration') || {})['minDuration'], 10)}
				max={parseInt((filter.get('duration') || {})['maxDuration'], 10)}
				range
				tipFormatter={(value) => {
					if (value === undefined) {
						return '';
					}
					return <div>asd</div>;
				}}
				onChange={onRangeSliderHandler}
				value={[parseInt(localMin, 10), parseInt(localMax, 10)]}
			/>
		</div>
	);
};

export default Duration;
