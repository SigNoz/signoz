import { useCallback } from 'react';
import { Button } from '@signozhq/ui';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import { AlertTriangle, LifeBuoy } from 'lucide-react';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';
import eyesEmojiUrl from '@/assets/Images/eyesEmoji.svg';

import type { K8sBaseListEmptyStateContext } from './K8sBaseList';

import styles from './K8sEmptyState.module.scss';

export interface K8sListResponseMetadata {
	sentAnyHostMetricsData?: boolean;
	isSendingK8SAgentMetrics?: boolean;
	endTimeBeforeRetention?: boolean;
}

type K8sEmptyStateProps = Partial<K8sBaseListEmptyStateContext>;

const handleContactSupport = (isCloudUser: boolean): void => {
	if (isCloudUser) {
		history.push('/support');
	} else {
		window.open('https://signoz.io/slack', '_blank');
	}
};

export function K8sEmptyState({
	isError,
	error,
	isLoading,
	rawData,
}: K8sEmptyStateProps): JSX.Element | null {
	const { isCloudUser } = useGetTenantLicense();

	const handleSupport = useCallback(() => {
		handleContactSupport(isCloudUser);
	}, [isCloudUser]);

	if (isLoading) {
		return null;
	}

	if (isError || error) {
		return (
			<div className={styles.container}>
				<div className={styles.content}>
					<AlertTriangle size={32} className={styles.errorIcon} />
					<span className={styles.message}>
						{error || 'An error occurred while fetching data.'}
					</span>
					<p>
						Our team is getting on top to resolve this. Please reach out to support if
						the issue persists.
					</p>
					<div className={styles.actions}>
						<Button
							onClick={handleSupport}
							variant="solid"
							color="secondary"
							prefix={<LifeBuoy size={14} />}
						>
							Contact Support
						</Button>
					</div>
				</div>
			</div>
		);
	}

	const metadata = rawData as K8sListResponseMetadata | undefined;

	if (metadata?.sentAnyHostMetricsData === false) {
		return (
			<div className={styles.container}>
				<div className={styles.content}>
					<img className={styles.eyesEmoji} src={eyesEmojiUrl} alt="eyes emoji" />
					<div className={styles.noDataMessage}>
						<h5 className={styles.title}>No host metrics data received yet</h5>
						<span className={styles.message}>
							Please refer to{' '}
							<a
								href="https://signoz.io/docs/userguide/hostmetrics/"
								target="_blank"
								rel="noreferrer"
							>
								our documentation
							</a>{' '}
							to learn how to send host metrics.
						</span>
					</div>
				</div>
			</div>
		);
	}

	if (metadata?.isSendingK8SAgentMetrics) {
		return (
			<div className={styles.container}>
				<div className={styles.content}>
					<img className={styles.eyesEmoji} src={eyesEmojiUrl} alt="eyes emoji" />
					<span className={styles.message}>
						To see K8s metrics, upgrade to the latest version of SigNoz k8s-infra
						chart. Please contact support if you need help.
					</span>
				</div>
			</div>
		);
	}

	if (metadata?.endTimeBeforeRetention) {
		return (
			<div className={styles.container}>
				<div className={styles.content}>
					<img className={styles.eyesEmoji} src={eyesEmojiUrl} alt="eyes emoji" />
					<div className={styles.noDataMessage}>
						<h5 className={styles.title}>
							Queried time range is before earliest K8s metrics
						</h5>
						<span className={styles.message}>
							Your requested end time is earlier than the earliest detected time of K8s
							metrics data, please adjust your end time.
						</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<img
					src={emptyStateUrl}
					alt="empty-state"
					className={styles.emptyStateSvg}
				/>
				<span className={styles.message}>
					This query had no results. Edit your query and try again!
				</span>
			</div>
		</div>
	);
}
