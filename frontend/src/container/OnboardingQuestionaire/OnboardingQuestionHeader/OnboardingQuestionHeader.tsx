import { Typography } from '@signozhq/ui/typography';

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
			<div className="onboarding-header-title">
				<Typography
					variant="label"
					size="large"
					weight="bold"
					color="main"
					as="h4"
					align="center"
					textOverflow="wrap"
				>
					{title}
				</Typography>
			</div>
			<div className="onboarding-header-subtitle">
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="secondary"
					as="p"
					align="center"
					textOverflow="wrap"
				>
					{subtitle}
				</Typography>
			</div>
		</div>
	);
}
