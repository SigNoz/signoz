import { Typography } from 'antd';

const BARBER_POOL_ICON = '/svgs/barber-pool.svg' as const;

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
				<img src={BARBER_POOL_ICON} alt="SigNoz" width="32" height="32" />
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
