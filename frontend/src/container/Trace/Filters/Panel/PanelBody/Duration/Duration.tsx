import React, { useState } from 'react';

import { Slider } from 'antd';
import { DurationText, InputComponent, TextCotainer, Text } from './styles';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';

const Duration = (): JSX.Element => {
	const { filter } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const duration = filter.get('duration') || {};

	const maxDuration = duration['maxDuration'] || '';
	const minDuration = duration['minDuration'] || '';

	const [localMax, setLocalMax] = useState<string>(maxDuration);
	const [localMin, setLocalMin] = useState<string>(minDuration);

	const defaultValue = [parseInt(minDuration, 10), parseInt(maxDuration, 10)];

	const onRangeSliderHandler = (number: [number, number]) => {
		const [min, max] = number;

		setLocalMin(min.toString());
		setLocalMax(max.toString());
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
					<InputComponent value={localMax} />
				</TextCotainer>
			</DurationText>

			<Slider
				defaultValue={[defaultValue[0], defaultValue[1]]}
				min={defaultValue[0]}
				max={defaultValue[1]}
				range
				tipFormatter={(value) => {
					return <div>asd</div>;
				}}
				onChange={onRangeSliderHandler}
				value={[parseInt(localMin, 10), parseInt(localMax, 10)]}
			/>
		</div>
	);
};

export default Duration;
