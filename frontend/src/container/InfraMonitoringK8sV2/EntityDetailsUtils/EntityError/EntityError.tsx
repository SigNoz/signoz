import { Typography } from '@signozhq/ui/typography';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { navigate } from 'lib/router/navigation';
import { ArrowRight } from '@signozhq/icons';
import { openInNewTab } from 'utils/navigation';

import awwSnapUrl from '@/assets/Icons/awwSnap.svg';

import styles from './EntityError.module.scss';

export default function EntityError(): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const handleContactSupport = (): void => {
		if (isCloudUserVal) {
			navigate('/support');
		} else {
			openInNewTab('https://signoz.io/slack');
		}
	};

	return (
		<div className={styles.container} data-testid="entity-error-state">
			<div className={styles.content}>
				<img src={awwSnapUrl} alt="error" className={styles.icon} />
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					<span className={styles.title}>Aw snap :/ </span>
					Something went wrong. Please try again or contact support.
				</Typography>

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
					<span className={styles.contactSupportText}>
						<Typography.Link
							/* TODO(typography): a link with no href renders plain text: a click that does not navigate is a Button with variant="link" */ variant="paragraph"
							size="base"
							weight="medium"
							textOverflow="wrap"
						>
							Contact Support
						</Typography.Link>
					</span>
					<ArrowRight size={14} />
				</div>
			</div>
		</div>
	);
}
