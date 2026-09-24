import { Typography } from '@signozhq/ui/typography';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import { ArrowRight } from '@signozhq/icons';
import { openInNewTab } from 'utils/navigation';

import awwSnapUrl from '@/assets/Icons/awwSnap.svg';

import styles from './EntityError.module.scss';

export default function EntityError(): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const handleContactSupport = (): void => {
		if (isCloudUserVal) {
			history.push('/support');
		} else {
			openInNewTab('https://signoz.io/slack');
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<img src={awwSnapUrl} alt="error" className={styles.icon} />
				<Typography.Text>
					<span className={styles.title}>Aw snap :/ </span>
					Something went wrong. Please try again or contact support.
				</Typography.Text>

				<div
					className={styles.contactSupport}
					onClick={handleContactSupport}
					role="button"
					tabIndex={0}
					onKeyDown={(e): void => {
						if (e.key === 'Enter') {
							handleContactSupport();
						}
					}}
				>
					<Typography.Link className={styles.contactSupportText}>
						Contact Support
					</Typography.Link>
					<ArrowRight size={14} />
				</div>
			</div>
		</div>
	);
}
