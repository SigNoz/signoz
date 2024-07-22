import { Input, Slider } from 'antd';
import { SliderRangeProps } from 'antd/es/slider';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
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

import { addFilter, FilterType, traceFilterKeys } from './filterUtils';

interface DurationProps {
	selectedFilters: FilterType | undefined;
	setSelectedFilters: Dispatch<SetStateAction<FilterType | undefined>>;
}

export function DurationSection(props: DurationProps): JSX.Element {
	const { setSelectedFilters, selectedFilters } = props;

	const getDuration = useMemo(() => {
		if (selectedFilters?.durationNanoMin || selectedFilters?.durationNanoMax) {
			return {
				minDuration: selectedFilters?.durationNanoMin?.values || '',
				maxDuration: selectedFilters?.durationNanoMax?.values || '',
			};
		}

		if (selectedFilters?.durationNano) {
			return {
				minDuration: getMs(selectedFilters?.durationNano?.values?.[0] || ''),
				maxDuration: getMs(selectedFilters?.durationNano?.values?.[1] || ''),
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
		setPreMax(getDuration.maxDuration as string);
		setPreMin(getDuration.minDuration as string);
	}, [getDuration]);

	const updateDurationFilter = (min: string, max: string): void => {
		const durationMin = 'durationNanoMin';
		const durationMax = 'durationNanoMax';

		addFilter(durationMin, min, setSelectedFilters, traceFilterKeys.durationNano);
		addFilter(durationMax, max, setSelectedFilters, traceFilterKeys.durationNano);
	};

	const onRangeSliderHandler = (number: [string, string]): void => {
		const [min, max] = number;

		setPreMin(min);
		setPreMax(max);
	};

	const debouncedFunction = useDebouncedFn((min, max) => {
		updateDurationFilter(min as string, max as string);
	}, 1500);

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
					data-testid="min-input"
					addonAfter="ms"
				/>
				<Input
					type="number"
					addonBefore="MAX"
					placeholder="100000000"
					className="min-max-input"
					onChange={onChangeMaxHandler}
					value={preMax}
					data-testid="max-input"
					addonAfter="ms"
				/>
			</div>
			<div>
				<Slider
					min={0}
					max={100000}
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
