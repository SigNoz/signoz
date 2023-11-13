import { Radio, RadioChangeEvent, Space, Typography } from 'antd';
import {
	OnboardingMethods,
	useOnboardingContext,
} from 'container/OnboardingContainer/context/OnboardingContext';
import { useState } from 'react';

export default function SelectMethod(): JSX.Element {
	const { selectedMethod, updateSelectedMethod } = useOnboardingContext();
	const [value, setValue] = useState(selectedMethod);

	const onChange = (e: RadioChangeEvent): void => {
		setValue(e.target.value);
		updateSelectedMethod(e.target.value);
	};

	return (
		<div>
			<Radio.Group onChange={onChange} value={value}>
				<Space direction="vertical">
					<Radio value={OnboardingMethods.RECOMMENDED_STEPS}>
						<Typography.Text> Use Recommended Steps </Typography.Text> <br />
						<small>Enter a short text about why we need the recommended steps.</small>
					</Radio>

					<Radio value={OnboardingMethods.QUICK_START}>
						<Typography.Text> Quick Start </Typography.Text> <br />
						<small>Enter a short text about why we need the quick start</small>
					</Radio>
				</Space>
			</Radio.Group>
		</div>
	);
}
