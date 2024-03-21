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
					<Radio value={OnboardingMethods.QUICK_START}>
						<Typography.Text> Quick Start </Typography.Text> <br />
						<small>Send data to SigNoz directly from OpenTelemetry SDK.</small>
					</Radio>

					<Radio value={OnboardingMethods.RECOMMENDED_STEPS}>
						<Typography.Text> Use Recommended Steps </Typography.Text> <br />
						<small>
							Send data to SigNoz via OpenTelemetry Collector (better control on data
							you send to SigNoz, collect host metrics & logs).
						</small>
					</Radio>
				</Space>
			</Radio.Group>
		</div>
	);
}
