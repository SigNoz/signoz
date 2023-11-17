import { Radio, RadioChangeEvent, Space, Typography } from 'antd';
import {
	OnboardingMethods,
	useOnboardingContext,
} from 'container/OnboardingContainer/context/OnboardingContext';
import useAnalytics from 'hooks/analytics/useAnalytics';
import { useEffect, useState } from 'react';

export default function SelectMethod(): JSX.Element {
	const {
		activeStep,
		selectedDataSource,
		selectedFramework,
		selectedEnvironment,
		selectedMethod,
		updateSelectedMethod,
	} = useOnboardingContext();
	const [value, setValue] = useState(selectedMethod);

	const { trackEvent } = useAnalytics();

	const onChange = (e: RadioChangeEvent): void => {
		setValue(e.target.value);
		updateSelectedMethod(e.target.value);
	};

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: Environment Selected', {
			dataSource: selectedDataSource,
			framework: selectedFramework,
			environment: selectedEnvironment,
			module: {
				name: activeStep?.module?.title,
				id: activeStep?.module?.id,
			},
			step: {
				name: activeStep?.step?.title,
				id: activeStep?.step?.id,
			},
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedMethod]);

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
