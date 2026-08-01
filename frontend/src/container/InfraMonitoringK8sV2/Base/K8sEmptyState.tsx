import ErrorContent from 'components/ErrorModal/components/ErrorContent';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';
import eyesEmojiUrl from '@/assets/Images/eyesEmoji.svg';

import type { K8sBaseListEmptyStateContext } from './K8sBaseList';

import styles from './K8sEmptyState.module.scss';

type K8sEmptyStateProps = Partial<K8sBaseListEmptyStateContext>;

export function K8sEmptyState({
	isError,
	error,
	isLoading,
	endTimeBeforeRetention,
}: K8sEmptyStateProps): JSX.Element | null {
	if (isLoading) {
		return null;
	}

	if (isError || error) {
		return (
			<div className={styles.container}>
				<div className={styles.errorContent}>
					<ErrorContent
						error={
							error ?? {
								code: 500,
								message: 'An error occurred while fetching data.',
							}
						}
					/>
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
