import { Typography } from 'antd';

import OnboardingAddDataSource from './OnboardingAddDataSource';

function OnboardingPageV2(): JSX.Element {
	return (
		<div className="onboarding-v2">
			<Typography.Title>Onboarding V2</Typography.Title>
			{/* #TODO: OnboardingAddDataSource is currently a Pure Component */}
			<OnboardingAddDataSource />
		</div>
	);
}
export default OnboardingPageV2;
