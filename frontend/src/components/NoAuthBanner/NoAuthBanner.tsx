import { AlertStrip } from '@signozhq/ui/alert-strip';

export function NoAuthBanner(): JSX.Element {
	return (
		<AlertStrip.CloseablePersisted
			color="warning"
			side="top"
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
}

export default NoAuthBanner;
