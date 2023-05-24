import { Slider } from 'antd';
import { SliderRangeProps } from 'antd/lib/slider';
import getFilters from 'api/trace/getFilters';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import {
	ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { getFilter, updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { Container, InputComponent, InputContainer, Text } from './styles';
import { getMs } from './util';

function Duration(): JSX.Element {
	const {
		filter,
		selectedFilter,
		filterToFetchData,
		spansAggregate,
		selectedTags,
		userSelectedFilter,
		isFilterExclude,
		spanKind,
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

		setPreMax(getMs(maxDuration));
		setPreMin(getMs(minDuration));
	}, [getDuration]);

	const updatedUrl = async (min: number, max: number): Promise<void> => {
		const preSelectedFilter = new Map(selectedFilter);
		const preUserSelected = new Map(userSelectedFilter);

		preSelectedFilter.set('duration', [
			String(max * 1000000),
			String(min * 1000000),
		]);

		const response = await getFilters({
			end: String(globalTime.maxTime),
			getFilters: filterToFetchData,
			other: Object.fromEntries(preSelectedFilter),
			start: String(globalTime.minTime),
			isFilterExclude,
			spanKind,
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
					spanKind,
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

	const onRangeSliderHandler = (number: [string, string]): void => {
		const [min, max] = number;

		setPreMin(min);
		setPreMax(max);
	};

	const debouncedFunction = useDebouncedFn(
		(min, max) => {
			updatedUrl(min as number, max as number);
		},
		1500,
		undefined,
	);

	const onChangeMaxHandler: ChangeEventHandler<HTMLInputElement> = (event) => {
		const { value } = event.target;
		const min = preMin;
		const max = value;

		onRangeSliderHandler([min, max]);
		debouncedFunction(min, max);
	};

	const onChangeMinHandler: ChangeEventHandler<HTMLInputElement> = (event) => {
		const { value } = event.target;
		const min = value;
		const max = preMax;

		onRangeSliderHandler([min, max]);
		debouncedFunction(min, max);
	};

	const onRangeHandler: SliderRangeProps['onChange'] = ([min, max]) => {
		updatedUrl(min, max);
	};

	const TipComponent = useCallback((value: undefined | number) => {
		if (value === undefined) {
			return <div />;
		}
		return <div>{`${value?.toString()}ms`}</div>;
	}, []);

	return (
		<div>
			<Container>
				<InputContainer>
					<Text>Min</Text>
				</InputContainer>
				<InputComponent
					addonAfter="ms"
					type="number"
					onChange={onChangeMinHandler}
					value={preMin}
				/>

				<InputContainer>
					<Text>Max</Text>
				</InputContainer>
				<InputComponent
					addonAfter="ms"
					type="number"
					onChange={onChangeMaxHandler}
					value={preMax}
				/>
			</Container>

			<Container>
				<Slider
					min={Number(getMs(String(preLocalMinDuration.current || 0)))}
					max={Number(getMs(String(preLocalMaxDuration.current || 0)))}
					range
					tooltip={{ formatter: TipComponent }}
					onChange={([min, max]): void => {
						onRangeSliderHandler([String(min), String(max)]);
					}}
					onAfterChange={onRangeHandler}
					value={[Number(preMin), Number(preMax)]}
				/>
			</Container>
		</div>
	);
}

export default Duration;
