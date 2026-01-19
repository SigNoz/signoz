import { Typography } from 'antd';

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
				<img src="/svgs/barber-pool.svg" alt="SigNoz" width="32" height="32" />
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
