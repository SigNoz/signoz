import { useEffect, useRef } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { useUnsavedChangesStore } from 'store/unsavedChanges/unsavedChangesStore';
import { reloadApp } from 'utils/appReload';

import { NEW_VERSION_TOAST_ID } from './constants';
import { useAppReloadNotice } from './useAppReloadNotice';
import { useAppVersionStore } from 'store/appVersion/appVersionStore';
import { useCheckVersionOnTabReturn } from './useCheckVersionOnTabReturn';
import { useLoadNewVersionOnNavigation } from './useLoadNewVersionOnNavigation';

function NewVersionPrompt(): null {
	const isNewVersionAvailable = useAppVersionStore(
		(state) => state.isNewVersionAvailable,
	);
	const hasUnsavedChanges = useUnsavedChangesStore((state) => state.count > 0);
	const hasPrompted = useRef(false);

	useAppReloadNotice();
	useCheckVersionOnTabReturn();
	useLoadNewVersionOnNavigation(isNewVersionAvailable && !hasUnsavedChanges);

	useEffect(() => {
		if (!isNewVersionAvailable || hasUnsavedChanges || hasPrompted.current) {
			return;
		}
		hasPrompted.current = true;
		toast.info('A new version of SigNoz is available', {
			id: NEW_VERSION_TOAST_ID,
			description: 'It loads when you open another page.',
			duration: Infinity,
			action: {
				label: 'Refresh',
				onClick: (): void => reloadApp({ reason: 'refresh-clicked', detail: '' }),
			},
		});
	}, [isNewVersionAvailable, hasUnsavedChanges]);

	return null;
}

export default NewVersionPrompt;
