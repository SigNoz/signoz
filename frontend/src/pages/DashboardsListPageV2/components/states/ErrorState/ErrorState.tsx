import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { ArrowUpRight, RotateCw } from '@signozhq/icons';
import { handleContactSupport } from 'container/Integrations/utils';

import awwSnapUrl from '@/assets/Icons/awwSnap.svg';

import { formatQueryErrorMessage } from '../../../utils';
import styles from './ErrorState.module.scss';

interface Props {
	isCloudUser: boolean;
	onRetry: () => void;
	httpStatus?: number;
	errorMessage?: string;
}

const GENERIC_MESSAGE =
	'Something went wrong :/ Please retry or contact support.';
const INVALID_QUERY_FALLBACK = 'Please review the syntax and try again.';

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

	const cleanedDetail = formatQueryErrorMessage(errorMessage);

	return (
		<div className={styles.wrapper}>
			<img src={awwSnapUrl} alt="something went wrong" className={styles.img} />

			{isClientError ? (
				<>
					<Typography.Text className={styles.errorText}>
						Invalid query
					</Typography.Text>
					<Typography.Text className={styles.errorDetail}>
						{cleanedDetail || INVALID_QUERY_FALLBACK}
					</Typography.Text>
				</>
			) : (
				<Typography.Text className={styles.errorText}>
					{GENERIC_MESSAGE}
				</Typography.Text>
			)}

			<section className={styles.actionButtons}>
				{!isClientError && (
					<Button
						variant="outlined"
						color="secondary"
						prefix={<RotateCw size={16} />}
						onClick={onRetry}
						testId="dashboards-list-retry"
					>
						Retry
					</Button>
				)}
				<Button
					variant="link"
					color="primary"
					className={styles.learnMore}
					onClick={(): void => handleContactSupport(isCloudUser)}
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
