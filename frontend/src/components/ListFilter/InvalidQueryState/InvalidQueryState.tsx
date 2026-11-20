import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { ArrowUpRight } from '@signozhq/icons';
import { handleContactSupport } from 'container/Integrations/utils';

import awwSnapUrl from '@/assets/Icons/awwSnap.svg';

import { formatQueryErrorMessage } from './utils';
import styles from './InvalidQueryState.module.scss';

interface Props {
	/** The backend's parse error for the list's DSL filter. */
	errorMessage?: string;
	isCloudUser: boolean;
	testIdPrefix: string;
	/** Runs before support opens, for analytics. */
	onContactSupport?: () => void;
}

const INVALID_QUERY_FALLBACK = 'Please review the syntax and try again.';

function InvalidQueryState({
	errorMessage,
	isCloudUser,
	testIdPrefix,
	onContactSupport,
}: Props): JSX.Element {
	const handleContactSupportClick = (): void => {
		onContactSupport?.();
		handleContactSupport(isCloudUser);
	};

	return (
		<div className={styles.wrapper} data-testid={`${testIdPrefix}-invalid-query`}>
			<img src={awwSnapUrl} alt="something went wrong" className={styles.img} />
			<Typography.Text
				className={styles.title}
				data-testid={`${testIdPrefix}-invalid-query-title`}
			>
				Invalid query
			</Typography.Text>
			<Typography.Text
				className={styles.detail}
				data-testid={`${testIdPrefix}-invalid-query-detail`}
			>
				{formatQueryErrorMessage(errorMessage) || INVALID_QUERY_FALLBACK}
			</Typography.Text>
			<section className={styles.actionButtons}>
				<Button
					size="md"
					variant="link"
					color="primary"
					onClick={handleContactSupportClick}
					testId={`${testIdPrefix}-contact-support`}
				>
					Contact Support
				</Button>
				<ArrowUpRight size={16} className={styles.learnMoreArrow} />
			</section>
		</div>
	);
}

export default InvalidQueryState;
