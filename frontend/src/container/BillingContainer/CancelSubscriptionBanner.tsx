import { useState } from 'react';
import { X } from '@signozhq/icons';
import { Button, DialogWrapper } from '@signozhq/ui';
import logEvent from 'api/common/logEvent';
import { pick } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { getBaseUrl } from 'utils/basePath';

import styles from './CancelSubscriptionBanner.module.scss';

function CancelSubscriptionBanner(): JSX.Element {
	const [open, setOpen] = useState(false);
	const { user, org } = useAppContext();

	const handleOpenCancelDialog = (): void => {
		void logEvent('Billing : Cancel Subscription Clicked', {
			user: pick(user, ['email', 'displayName', 'role', 'organization']),
			role: user?.role,
		});
		setOpen(true);
	};

	const handleContactSupport = (): void => {
		void logEvent('Billing : Cancel Subscription Confirmed', {
			user: pick(user, ['email', 'displayName', 'role', 'organization']),
			role: user?.role,
		});
		const subject = encodeURIComponent('Cancel My SigNoz Subscription');
		const orgName = org?.[0]?.displayName ?? '';
		const body = encodeURIComponent(
			[
				'Hi SigNoz Team,',
				'',
				'I would like to cancel my SigNoz Cloud subscription.',
				'Please find my account details below.',
				'',
				'Account Details:',
				`  • SigNoz URL: ${getBaseUrl()}`,
				...(orgName ? [`  • Organization: ${orgName}`] : []),
				`  • Account Email: ${user?.email ?? ''}`,
				'',
				'Reason for Cancellation:',
				'[Please share the reason for cancellation]',
				'',
				'Additional feedback (optional):',
				'[Any other feedback]',
				'',
				'Regards,',
				'[user name or team name]',
			].join('\n'),
		);
		const link = document.createElement('a');
		link.href = `mailto:cloud-support@signoz.io?subject=${subject}&body=${body}`;
		link.click();
		setOpen(false);
	};

	const footer = (
		<>
			<Button
				variant="solid"
				color="secondary"
				onClick={(): void => setOpen(false)}
			>
				Keep Subscription
			</Button>
			<Button variant="solid" color="destructive" onClick={handleContactSupport}>
				Contact Support
			</Button>
		</>
	);

	return (
		<>
			<div className={styles.banner}>
				<div className={styles.info}>
					<span className={styles.title}>Cancel Subscription</span>
					<span className={styles.subtitle}>Cancel your SigNoz subscription.</span>
				</div>
				<Button
					variant="solid"
					color="destructive"
					prefix={<X size={12} />}
					onClick={handleOpenCancelDialog}
				>
					Cancel Subscription
				</Button>
			</div>
			<DialogWrapper
				open={open}
				onOpenChange={setOpen}
				title="Cancel your subscription"
				width="narrow"
				showCloseButton={false}
				footer={footer}
			>
				<p className={styles.dialogBody}>
					To cancel your SigNoz subscription, please reach out to our support team.
					We&apos;ll be happy to assist you.
				</p>
			</DialogWrapper>
		</>
	);
}

export default CancelSubscriptionBanner;
