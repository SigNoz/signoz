import './WaitListFragment.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { useNotifications } from 'hooks/useNotifications';
import { CheckCircle2, HandPlatter } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function WaitlistFragment({
	entityType,
}: {
	entityType: string;
}): JSX.Element {
	const { user } = useAppContext();
	const { t } = useTranslation(['infraMonitoring']);
	const { notifications } = useNotifications();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const handleJoinWaitlist = (): void => {
		if (!user || !user.email) return;

		setIsSubmitting(true);

		logEvent('Infra Monitoring: Get Early Access Clicked', {
			entity_type: entityType,
			userEmail: user.email,
		})
			.then(() => {
				notifications.success({
					message: t('waitlist_success_message'),
				});

				setIsSubmitting(false);
				setIsSuccess(true);

				setTimeout(() => {
					setIsSuccess(false);
				}, 4000);
			})
			.catch((error) => {
				console.error('Error logging event:', error);
			});
	};

	return (
		<div className="wait-list-container">
			<Typography.Text className="wait-list-text">
				{t('waitlist_message')}
			</Typography.Text>

			<Button
				className="periscope-btn join-waitlist-btn"
				type="default"
				loading={isSubmitting}
				icon={
					isSuccess ? (
						<CheckCircle2 size={16} color={Color.BG_FOREST_500} />
					) : (
						<HandPlatter size={16} />
					)
				}
				onClick={handleJoinWaitlist}
			>
				Get early access
			</Button>
		</div>
	);
}
