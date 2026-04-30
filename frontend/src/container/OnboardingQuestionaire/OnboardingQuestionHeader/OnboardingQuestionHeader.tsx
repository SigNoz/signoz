import { Typography } from 'antd';

import barberPoolUrl from '@/assets/svgs/barber-pool.svg';

interface OnboardingQuestionHeaderProps {
	title: string;
	subtitle: string;
}

export function OnboardingQuestionHeader({
	title,
	subtitle,
}: OnboardingQuestionHeaderProps): JSX.Element {
	return (
		<div className="onboarding-header-section">
			<div className="onboarding-header-icon">
				<img src={barberPoolUrl} alt="SigNoz" width="32" height="32" />
			</div>
			<Typography.Title level={4} className="onboarding-header-title">
				{title}
			</Typography.Title>
			<Typography.Paragraph className="onboarding-header-subtitle">
				{subtitle}
			</Typography.Paragraph>
		</div>
	);
}
