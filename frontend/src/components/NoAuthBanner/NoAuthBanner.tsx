import { createPortal } from 'react-dom';
import { AlertStrip } from '@signozhq/ui/alert-strip';
import { useBottomStripStore } from 'container/BottomStrip/store/useBottomStripStore';

export function NoAuthBanner(): JSX.Element {
	const bottomSlot = useBottomStripStore((s) => s.topSlot);

	const banner = (
		<AlertStrip.CloseablePersisted
			color="warning"
			side={bottomSlot ? 'bottom' : 'top'}
			storageKey="no-auth-banner-v1"
			testId="no-auth-banner"
		>
			Impersonation mode: authentication is disabled. Anyone with access to this
			instance has admin privileges.{' '}
			<AlertStrip.Link
				href="https://signoz.io/docs/manage/administrator-guide/configuration/impersonation-mode/"
				target="_blank"
			>
				Learn more
			</AlertStrip.Link>
		</AlertStrip.CloseablePersisted>
	);

	return bottomSlot ? createPortal(banner, bottomSlot) : banner;
}

export default NoAuthBanner;
