import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { ArrowUpRight, RotateCw } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import InvalidQueryState from 'components/ListFilter/InvalidQueryState/InvalidQueryState';
import { handleContactSupport } from 'container/Integrations/utils';
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';

import awwSnapUrl from '@/assets/Icons/awwSnap.svg';

import styles from './ErrorState.module.scss';

interface Props {
	isCloudUser: boolean;
	onRetry: () => void;
	httpStatus?: number;
	errorMessage?: string;
}

const GENERIC_MESSAGE =
	'Something went wrong :/ Please retry or contact support.';

function ErrorState({
	isCloudUser,
	onRetry,
	httpStatus,
	errorMessage,
}: Props): JSX.Element {
	// 4xx responses are client errors — the same request will keep failing.
	// Surface the BE-provided detail (e.g. DSL parse errors) and skip Retry.
	const isClientError =
		httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500;

	const handleRetry = (): void => {
		void logEvent(DashboardListEvents.ErrorStateAction, {
			action: 'retry',
		});
		onRetry();
	};

	const logContactSupport = (): void => {
		void logEvent(DashboardListEvents.ErrorStateAction, {
			action: 'contactSupport',
		});
	};

	const handleContactSupportClick = (): void => {
		logContactSupport();
		handleContactSupport(isCloudUser);
	};

	if (isClientError) {
		return (
			<InvalidQueryState
				errorMessage={errorMessage}
				isCloudUser={isCloudUser}
				testIdPrefix="dashboards-list"
				onContactSupport={logContactSupport}
			/>
		);
	}

	return (
		<div className={styles.wrapper}>
			<img src={awwSnapUrl} alt="something went wrong" className={styles.img} />

			<Typography.Text className={styles.errorText}>
				{GENERIC_MESSAGE}
			</Typography.Text>

			<section className={styles.actionButtons}>
				<Button
					size="md"
					variant="outlined"
					color="secondary"
					prefix={<RotateCw size={16} />}
					onClick={handleRetry}
					testId="dashboards-list-retry"
				>
					Retry
				</Button>
				<Button
					size="md"
					variant="link"
					color="primary"
					onClick={handleContactSupportClick}
					testId="dashboards-list-contact-support"
				>
					Contact Support
				</Button>
				<ArrowUpRight size={16} className={styles.learnMoreArrow} />
			</section>
		</div>
	);
}

export default ErrorState;
