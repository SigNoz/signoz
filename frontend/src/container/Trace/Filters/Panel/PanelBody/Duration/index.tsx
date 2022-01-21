import React from 'react';

import { Slider } from 'antd';
import { DurationText, InputComponent, TextCotainer, Text } from './styles';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import Spinner from 'components/Spinner';

const Duration = (): JSX.Element => {
	const { filter, filterLoading } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const duration = filter.get('duration') || {};

	const maxDuration = duration['maxDuration'] || '';
	const minDuration = duration['minDuration'] || '';

	const defaultValue = [parseInt(minDuration, 10), parseInt(maxDuration, 10)];

	if (filterLoading) {
		return (
				<Spinner height='10vh' tip="Loading.." />
		);
	}

	return (
		<div>
			<DurationText>
				<TextCotainer>
					<Text>Min</Text>
					<InputComponent value={minDuration} />
				</TextCotainer>

				<TextCotainer>
					<Text>Max</Text>
					<InputComponent value={maxDuration} />
				</TextCotainer>
			</DurationText>

			<Slider
				defaultValue={[defaultValue[0], defaultValue[1]]}
				min={defaultValue[0]}
				max={defaultValue[1]}
				range
			/>
		</div>
	);
};

export default Duration;
