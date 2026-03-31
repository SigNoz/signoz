import { useState } from 'react';

import AnnouncementBanner, {
	AnnouncementBannerProps,
} from './AnnouncementBanner';

interface PersistedAnnouncementBannerProps extends AnnouncementBannerProps {
	storageKey: string;
	onDismiss?: () => void;
}

function isDismissed(storageKey: string): boolean {
	return localStorage.getItem(storageKey) === 'true';
}

export default function PersistedAnnouncementBanner({
	storageKey,
	onDismiss,
	...props
}: PersistedAnnouncementBannerProps): JSX.Element | null {
	const [visible, setVisible] = useState(() => !isDismissed(storageKey));

	if (!visible) {
		return null;
	}

	const handleClose = (): void => {
		localStorage.setItem(storageKey, 'true');
		setVisible(false);
		onDismiss?.();
	};

	return <AnnouncementBanner {...props} onClose={handleClose} />;
}
