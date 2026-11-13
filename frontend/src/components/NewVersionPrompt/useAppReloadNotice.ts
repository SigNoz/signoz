import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import { consumeAppReload } from 'utils/appReload';

export function useAppReloadNotice(): void {
	useEffect(() => {
		const reload = consumeAppReload();
		if (!reload) {
			return;
		}
		const toVersion = process.env.VERSION;
		const isUpdated = reload.fromVersion !== toVersion;
		const data = { ...reload, toVersion };

		Sentry.addBreadcrumb({
			category: 'app.reload',
			message: isUpdated
				? 'Page reloaded to load the latest version'
				: 'Page reloaded',
			data,
		});
		void logEvent('App: Reloaded', data);

		if (isUpdated) {
			toast.info('SigNoz was updated', {
				description: 'The page reloaded to load the latest version.',
			});
		} else {
			toast.info('The page reloaded', {
				description: 'Part of the page failed to load.',
			});
		}
	}, []);
}
