import { useEffect, useRef, useState } from 'react';
import {
	CircleCheck,
	Copy,
	MailOpen,
	SolidInfoCircle,
	Undo2,
	X,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import logEvent from 'api/common/logEvent';
import { pick } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useCopyToClipboard } from 'react-use';
import { getBaseUrl } from 'utils/basePath';
import { Color } from '@signozhq/design-tokens';

import styles from './CancelSubscriptionBanner.module.scss';

const SUPPORT_EMAIL = 'cloud-support@signoz.io';
const MAX_MAILTO_URI_LENGTH = 1800;

type DialogView = 'confirm' | 'fallback';

function buildEmailBody(orgName: string, userEmail: string): string {
	return [
		'Hi SigNoz Team,',
		'',
		'I would like to cancel my SigNoz Cloud subscription.',
		'Please find my account details below.',
		'',
		'Account Details:',
		`  • SigNoz URL: ${getBaseUrl()}`,
		...(orgName ? [`  • Organization: ${orgName}`] : []),
		`  • Account Email: ${userEmail}`,
		'',
		'Reason for Cancellation:',
		'[Please share the reason for cancellation]',
		'',
		'Additional feedback (optional):',
		'[Any other feedback]',
		'',
		'Regards,',
		'[user name or team name]',
	].join('\n');
}

function buildMailtoUri(orgName: string, userEmail: string): string {
	const subject = encodeURIComponent('Cancel My SigNoz Subscription');
	const body = encodeURIComponent(buildEmailBody(orgName, userEmail));
	const full = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
	if (full.length <= MAX_MAILTO_URI_LENGTH) {
		return full;
	}
	const shortBody = encodeURIComponent(
		'Hi SigNoz Team,\n\nI would like to cancel my SigNoz Cloud subscription.\nPlease find my account details and reason for cancellation below.\n\n[Your details here]\n\nRegards,',
	);
	return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${shortBody}`;
}

function openMailto(uri: string): void {
	const link = document.createElement('a');
	link.href = uri;
	link.style.display = 'none';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function CancelSubscriptionBanner(): JSX.Element {
	const [dialogView, setDialogView] = useState<DialogView | null>(null);
	const [confirmText, setConfirmText] = useState('');
	const [copied, setCopied] = useState(false);
	const [, copyToClipboard] = useCopyToClipboard();
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { user, org } = useAppContext();

	useEffect(
		() => (): void => {
			if (copyTimerRef.current) {
				clearTimeout(copyTimerRef.current);
			}
		},
		[],
	);

	const orgName = org?.[0]?.displayName ?? '';
	const userEmail = user?.email ?? '';

	const handleOpenCancelDialog = (): void => {
		void logEvent('Billing : Cancel Subscription Clicked', {
			user: pick(user, ['email', 'displayName', 'role', 'organization']),
			role: user?.role,
		});
		setDialogView('confirm');
	};

	const handleContactSupport = (): void => {
		void logEvent('Billing : Cancel Subscription Confirmed', {
			user: pick(user, ['email', 'displayName', 'role', 'organization']),
			role: user?.role,
		});
		openMailto(buildMailtoUri(orgName, userEmail));
		setConfirmText('');
		setDialogView('fallback');
	};

	const handleCopyTemplate = (): void => {
		void logEvent('Billing : Cancel Subscription Email Template Copied', {
			user: pick(user, ['email', 'displayName', 'role', 'organization']),
			role: user?.role,
		});
		copyToClipboard(buildEmailBody(orgName, userEmail));
		setCopied(true);
		if (copyTimerRef.current) {
			clearTimeout(copyTimerRef.current);
		}
		copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
	};

	const handleRetryMailto = (): void => {
		void logEvent('Billing : Cancel Subscription Email Client Reopened', {
			user: pick(user, ['email', 'displayName', 'role', 'organization']),
			role: user?.role,
		});
	};

	const handleClose = (): void => {
		if (copyTimerRef.current) {
			clearTimeout(copyTimerRef.current);
		}
		setDialogView(null);
		setConfirmText('');
		setCopied(false);
	};

	const confirmFooter = (
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
				data-testid="cancel-subscription-confirm-btn"
			>
				Cancel subscription
			</Button>
		</>
	);

	const fallbackFooter = (
		<Button variant="solid" color="secondary" onClick={handleClose}>
			Close
		</Button>
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
				open={dialogView !== null}
				onOpenChange={handleClose}
				title="Cancel your subscription?"
				width="narrow"
				showCloseButton={false}
				footer={dialogView === 'confirm' ? confirmFooter : fallbackFooter}
			>
				{dialogView === 'confirm' && (
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
							data-testid="cancel-confirm-input"
						/>
					</div>
				)}
				{dialogView === 'fallback' && (
					<div className={styles.fallbackBody}>
						<p className={styles.fallbackHint}>
							An email draft has been opened. If it did not open, send your
							cancellation request directly to:
						</p>
						<span className={styles.fallbackEmail}>{SUPPORT_EMAIL}</span>
						<div className={styles.fallbackActions}>
							<Button
								variant="outlined"
								color="secondary"
								prefix={copied ? <CircleCheck size={14} /> : <Copy size={14} />}
								onClick={handleCopyTemplate}
								data-testid="copy-email-template-btn"
							>
								{copied ? 'Copied!' : 'Copy email template'}
							</Button>
							<Button
								asChild
								variant="outlined"
								color="secondary"
								data-testid="retry-mailto-btn"
							>
								<a
									href={buildMailtoUri(orgName, userEmail)}
									onClick={handleRetryMailto}
									className={styles.retryLink}
									target="_blank"
									rel="noopener noreferrer"
								>
									<MailOpen size={14} />
									Reopen email client
								</a>
							</Button>
						</div>
					</div>
				)}
			</DialogWrapper>
		</>
	);
}

export default CancelSubscriptionBanner;
