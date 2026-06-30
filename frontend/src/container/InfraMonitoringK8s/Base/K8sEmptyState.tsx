import { useCallback } from 'react';
import { Button } from '@signozhq/ui/button';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import { LifeBuoy, TriangleAlert } from '@signozhq/icons';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';
import eyesEmojiUrl from '@/assets/Images/eyesEmoji.svg';

import type { K8sBaseListEmptyStateContext } from './K8sBaseList';

import styles from './K8sEmptyState.module.scss';

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
	endTimeBeforeRetention,
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
					<TriangleAlert size={32} className={styles.errorIcon} />
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

	if (endTimeBeforeRetention) {
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
