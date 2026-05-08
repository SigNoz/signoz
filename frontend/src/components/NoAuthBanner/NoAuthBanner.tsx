import { PersistedAnnouncementBanner } from '@signozhq/ui/announcement-banner';

import styles from './NoAuthBanner.module.scss';

export function NoAuthBanner(): JSX.Element {
	return (
		<PersistedAnnouncementBanner
			type="warning"
			storageKey="no-auth-banner-v1"
			testId="no-auth-banner"
			className={styles.banner}
		>
			No-auth mode: authentication is disabled, network is the trust boundary.
		</PersistedAnnouncementBanner>
	);
}

export default NoAuthBanner;
