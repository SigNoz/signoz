import { useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';

import { SAVED_VIEW_TOAST_POSITION } from '../constants';
import { UseSavedViewActionsResult } from '../types';

export function useSaveNewView(
	createView: UseSavedViewActionsResult['createView'],
): (displayName: string) => Promise<boolean> {
	return useCallback(
		async (displayName: string): Promise<boolean> => {
			if (!(await createView(displayName))) {
				return false;
			}
			toast.success('View created', {
				position: SAVED_VIEW_TOAST_POSITION,
			});
			return true;
		},
		[createView],
	);
}
