import { useState } from 'react';
import { SolidInfoCircle, Undo2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import logEvent from 'api/common/logEvent';
import { pick } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { getBaseUrl } from 'utils/basePath';

import styles from './CancelSubscriptionBanner.module.scss';
import { Color } from '@signozhq/design-tokens';

function CancelSubscriptionBanner(): JSX.Element {
	const [open, setOpen] = useState(false);
	const [confirmText, setConfirmText] = useState('');
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
		setConfirmText('');
	};

	const handleClose = (): void => {
		setOpen(false);
		setConfirmText('');
	};

	const footer = (
		<>
			<Button
				variant="solid"
				color="secondary"
				prefix={<Undo2 size={14} />}
				onClick={handleClose}
			>
				Go back
			</Button>
			<Button
				variant="solid"
				color="destructive"
				prefix={<X size={14} />}
				disabled={confirmText !== 'cancel'}
				onClick={handleContactSupport}
			>
				Cancel subscription
			</Button>
		</>
	);

	return (
		<>
			<div className={styles.banner}>
				<div className={styles.info}>
					<div className={styles.titleRow}>
						<SolidInfoCircle color={Color.BG_SAKURA_500} size={12} />
						<span className={styles.title}>Cancel your subscription</span>
					</div>
					<span className={styles.subtitle}>
						When you cancel your SigNoz subscription, all your data will be deleted
						immediately and removed from our servers.
					</span>
				</div>
				<Button
					variant="solid"
					color="secondary"
					prefix={<X size={12} />}
					onClick={handleOpenCancelDialog}
					className={styles.cancelButton}
				>
					Cancel Subscription
				</Button>
			</div>
			<DialogWrapper
				open={open}
				onOpenChange={handleClose}
				title="Cancel your subscription?"
				width="narrow"
				showCloseButton={false}
				footer={footer}
			>
				<div className={styles.dialogBody}>
					<p className={styles.dialogDescription}>
						Cancelling your subscription would stop your data from being ingested to
						SigNoz. All the data that has been already sent will also be deleted.
					</p>
					<p className={styles.dialogConfirmLabel}>
						Type <code>cancel</code> to confirm the cancellation.
					</p>
					<Input
						placeholder="Enter the word cancel..."
						value={confirmText}
						onChange={(e): void => setConfirmText(e.target.value)}
					/>
				</div>
			</DialogWrapper>
		</>
	);
}

export default CancelSubscriptionBanner;
