/* eslint-disable react/no-unstable-nested-components */
import { Input, Slider } from 'antd';
import { SliderRangeProps } from 'antd/lib/slider';
import getFilters from 'api/trace/getFilters';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const getMs = (value: string): string => {
	return parseFloat(
		dayjs
			.duration({
				milliseconds: parseInt(value, 10) / 1000000,
			})
			.format('SSS'),
	).toFixed(2);
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

	const preLocalMaxDuration = useRef<number>();
	const preLocalMinDuration = useRef<number>();

	const getDuration = useMemo(() => {
		const selectedDuration = selectedFilter.get('duration');

		if (selectedDuration) {
			return {
				maxDuration: selectedDuration[0],
				minDuration: selectedDuration[1],
			};
		}

		return filter.get('duration') || {};
	}, [selectedFilter, filter]);

	const [preMax, setPreMax] = useState<string>('');
	const [preMin, setPreMin] = useState<string>('');

	useEffect(() => {
		const duration = getDuration || {};

		const maxDuration = duration.maxDuration || '0';
		const minDuration = duration.minDuration || '0';

		if (preLocalMaxDuration.current === undefined) {
			preLocalMaxDuration.current = parseFloat(maxDuration);
		}
		if (preLocalMinDuration.current === undefined) {
			preLocalMinDuration.current = parseFloat(minDuration);
		}

		setPreMax(maxDuration);
		setPreMin(minDuration);
	}, [getDuration]);

	const defaultValue = [parseFloat(preMin), parseFloat(preMax)];

	const updatedUrl = async (min: number, max: number): Promise<void> => {
		const preSelectedFilter = new Map(selectedFilter);
		const preUserSelected = new Map(userSelectedFilter);

		preSelectedFilter.set('duration', [String(max), String(min)]);

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
				const values = Object.keys(value);
				if (key !== 'duration' && values.length) {
					preUserSelected.set(key, values);
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
					order: spansAggregate.order,
					pageSize: spansAggregate.pageSize,
					orderParam: spansAggregate.orderParam,
				},
			});

			updateURL(
				preSelectedFilter,
				filterToFetchData,
				spansAggregate.currentPage,
				selectedTags,
				isFilterExclude,
				userSelectedFilter,
				spansAggregate.order,
				spansAggregate.pageSize,
				spansAggregate.orderParam,
			);
		}
	};

	const onRangeSliderHandler = (number: [number, number]): void => {
		const [min, max] = number;

		setPreMin(min.toString());
		setPreMax(max.toString());
	};

	const debouncedFunction = useDebouncedFn(
		(min, max) => {
			updatedUrl(min as number, max as number);
		},
		500,
		undefined,
	);

	const onChangeMaxHandler: React.ChangeEventHandler<HTMLInputElement> = (
		event,
	) => {
		const { value } = event.target;
		const min = parseFloat(preMin);
		const max = parseFloat(value) * 1000000;

		onRangeSliderHandler([min, max]);
		debouncedFunction(min, max);
	};

	const onChangeMinHandler: React.ChangeEventHandler<HTMLInputElement> = (
		event,
	) => {
		const { value } = event.target;
		const min = parseFloat(value) * 1000000;
		const max = parseFloat(preMax);
		onRangeSliderHandler([min, max]);
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
					value={getMs(preMin)}
				/>

				<InputContainer>
					<Text>Max</Text>
				</InputContainer>
				<Input
					addonAfter="ms"
					onChange={onChangeMaxHandler}
					value={getMs(preMax)}
				/>
			</Container>

			<Container>
				<Slider
					defaultValue={[defaultValue[0], defaultValue[1]]}
					min={parseFloat((preLocalMinDuration.current || 0).toString())}
					max={parseFloat((preLocalMaxDuration.current || 0).toString())}
					range
					tipFormatter={(value): JSX.Element => {
						if (value === undefined) {
							return <div />;
						}
						return <div>{`${getMs(value?.toString())}ms`}</div>;
					}}
					onChange={([min, max]): void => {
						onRangeSliderHandler([min, max]);
					}}
					onAfterChange={onRangeHandler}
					value={[parseFloat(preMin), parseFloat(preMax)]}
				/>
			</Container>
		</div>
	);
}

export default Duration;
