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

				<Typography.Link
					variant="paragraph"
					size="base"
					weight="medium"
					display="inline-flex"
					gap={4}
					marginTop={8}
					textOverflow="wrap"
					onClick={handleContactSupport}
					testId="entity-error-contact-support"
				>
					Contact Support
					<ArrowRight size={14} />
				</Typography.Link>
			</div>
		</div>
	);
}
