import { Input, Slider } from 'antd';
import { SliderRangeProps } from 'antd/es/slider';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import {
	ChangeEventHandler,
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

import { addFilter, FilterType } from './filterUtils';

interface DurationProps {
	selectedFilters: FilterType | undefined;
	setSelectedFilters: Dispatch<SetStateAction<FilterType | undefined>>;
}

const durationKey: BaseAutocompleteData = {
	key: 'durationNano',
	dataType: DataTypes.Float64,
	type: 'tag',
	isColumn: true,
	isJSON: false,
	id: 'durationNano--float64--tag--true',
};

export function DurationSection(props: DurationProps): JSX.Element {
	const { setSelectedFilters, selectedFilters } = props;

	const getDuration = useMemo(() => {
		const selectedDuration = selectedFilters?.durationNano;
		console.log(selectedDuration, selectedFilters?.durationNano);

		if (selectedDuration) {
			if (selectedDuration.values.length === 1) {
				return {
					maxDuration: selectedDuration.values?.[0],
					minDuration: '',
				};
			}
			return {
				maxDuration: selectedDuration.values?.[1],
				minDuration: selectedDuration.values?.[0],
			};
		}

		return {
			maxDuration: '',
			minDuration: '',
		};
	}, [selectedFilters]);

	const [preMax, setPreMax] = useState<string>('');
	const [preMin, setPreMin] = useState<string>('');

	useEffect(() => {
		if (getDuration.maxDuration) {
			setPreMax(getDuration.maxDuration);
		}
		if (getDuration.minDuration) {
			setPreMin(getDuration.minDuration);
		}
	}, [getDuration]);

	console.log(getDuration, preMax, preMin);

	const updateDurationFilter = (min: string, max: string): void => {
		setSelectedFilters((prevFilters) => {
			const type = 'durationNano';
			if (!prevFilters || !prevFilters[type]?.values.length) {
				return prevFilters;
			}

			return { ...prevFilters, [type]: [] } as any;
		});
		addFilter('durationNano', min, setSelectedFilters, durationKey);
		addFilter('durationNano', max, setSelectedFilters, durationKey);
	};

	const onRangeSliderHandler = (number: [string, string]): void => {
		const [min, max] = number;

		setPreMin(min);
		setPreMax(max);
	};

	const debouncedFunction = useDebouncedFn(
		(min, max) => {
			updateDurationFilter(min as string, max as string);
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
		updateDurationFilter(min.toString(), max.toString());
	};

	const TipComponent = useCallback((value: undefined | number) => {
		if (value === undefined) {
			return <div />;
		}
		return <div>{`${value?.toString()}ms`}</div>;
	}, []);

	return (
		<div>
			<div className="duration-inputs">
				<Input
					type="number"
					addonBefore="MIN"
					placeholder="0"
					className="min-max-input"
					onChange={onChangeMinHandler}
					value={preMin}
					addonAfter="ms"
				/>
				<Input
					type="number"
					addonBefore="MAX"
					placeholder="10000"
					className="min-max-input"
					onChange={onChangeMaxHandler}
					value={preMax}
					addonAfter="ms"
				/>
			</div>
			<div>
				<Slider
					min={0}
					max={10000}
					range
					tooltip={{ formatter: TipComponent }}
					onChange={([min, max]): void => {
						onRangeSliderHandler([String(min), String(max)]);
					}}
					onAfterChange={onRangeHandler}
					value={[Number(preMin), Number(preMax)]}
				/>
			</div>
		</div>
	);
}
