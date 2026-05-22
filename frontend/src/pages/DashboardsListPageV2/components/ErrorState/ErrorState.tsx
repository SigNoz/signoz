import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { ArrowUpRight, RotateCw } from '@signozhq/icons';
import { handleContactSupport } from 'container/Integrations/utils';

import awwSnapUrl from '@/assets/Icons/awwSnap.svg';

import styles from './ErrorState.module.scss';

interface Props {
	isCloudUser: boolean;
	onRetry: () => void;
}

function ErrorState({ isCloudUser, onRetry }: Props): JSX.Element {
	return (
		<div className={styles.wrapper}>
			<img src={awwSnapUrl} alt="something went wrong" className={styles.img} />
			<Typography.Text className={styles.errorText}>
				Something went wrong :/ Please retry or contact support.
			</Typography.Text>
			<section className={styles.actionButtons}>
				<Button
					className={styles.retryButton}
					type="text"
					icon={<RotateCw size={16} />}
					onClick={onRetry}
				>
					Retry
				</Button>
				<Button
					type="text"
					className={styles.learnMore}
					onClick={(): void => handleContactSupport(isCloudUser)}
				>
					Contact Support
				</Button>
				<ArrowUpRight size={16} className={styles.learnMoreArrow} />
			</section>
		</div>
	);
}

export default ErrorState;
