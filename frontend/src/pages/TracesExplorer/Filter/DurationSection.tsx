import { Input, Slider } from 'antd';
import { useCallback } from 'react';

export function DurationSection(): JSX.Element {
	const TipComponent = useCallback((value: undefined | number) => {
		if (value === undefined) {
			return <div />;
		}
		return <div>{`${value?.toString()}ms`}</div>;
	}, []);

	return (
		<div>
			<div className="duration-inputs">
				<Input type="number" addonBefore="MIN" placeholder="0ms" />
				<Input type="number" addonBefore="MAX" placeholder="10000ms" />
			</div>
			<div>
				<Slider min={0} max={10000} range tooltip={{ formatter: TipComponent }} />
			</div>
		</div>
	);
}
