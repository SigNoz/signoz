import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { toast } from '@signozhq/ui/sonner';
import {
	useDeleteSavedView,
	useUpdateSavedView,
} from 'api/generated/services/saved-view';
import {
	RenderErrorResponseDTO,
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import { QueryParams } from 'constants/query';
import { buildExplorerNavigationUrl } from 'container/AIAssistant/components/ActionsSection/utils/openSavedView';
import { getAbsoluteUrl } from 'utils/basePath';
import { toAPIError } from 'utils/errorUtils';

import {
	SAVED_VIEW_SCHEMA_VERSION,
	SAVED_VIEW_TOAST_POSITION,
} from '../constants';
import { SavedViewEventKeys, SavedViewEvents } from '../events';
import { UseSavedViewRowActionsResult } from '../types';
import { getSavedViewQuery } from '../utils/getSavedViewQuery';
import { invalidateSavedViews } from '../utils/invalidateSavedViews';
import { useSavedViewLogEvent } from './useSavedViewLogEvent';

function showErrorToast(error: unknown, fallback: string): void {
	toast.error(
		toAPIError(
			error as ErrorType<RenderErrorResponseDTO>,
			fallback,
		).getErrorMessage(),
		{ position: SAVED_VIEW_TOAST_POSITION },
	);
}

export function useSavedViewRowActions(
	source: SavedviewtypesSourceDTO,
): UseSavedViewRowActionsResult {
	const queryClient = useQueryClient();
	const { pathname } = useLocation();
	const [, copyToClipboard] = useCopyToClipboard();
	const logSavedViewEvent = useSavedViewLogEvent(source);
	const { mutateAsync: updateSavedView, isLoading: isRenaming } =
		useUpdateSavedView();
	const { mutateAsync: deleteSavedView, isLoading: isDeleting } =
		useDeleteSavedView();

	const copyViewLink = useCallback(
		(view: SavedviewtypesSavedViewDTO): void => {
			const path = buildExplorerNavigationUrl(pathname, getSavedViewQuery(view), {
				[QueryParams.panelTypes]: view.spec.panelType,
				[QueryParams.viewKey]: view.id,
			});
			copyToClipboard(getAbsoluteUrl(path));
			toast.success('Link copied', { position: SAVED_VIEW_TOAST_POSITION });
			logSavedViewEvent(SavedViewEvents.LinkCopied, {
				[SavedViewEventKeys.ViewId]: view.id,
			});
		},
		[pathname, copyToClipboard, logSavedViewEvent],
	);

	const copyViewId = useCallback(
		(view: SavedviewtypesSavedViewDTO): void => {
			copyToClipboard(view.id);
			toast.success('View ID copied', { position: SAVED_VIEW_TOAST_POSITION });
		},
		[copyToClipboard],
	);

	const renameView = useCallback(
		async (
			view: SavedviewtypesSavedViewDTO,
			displayName: string,
		): Promise<boolean> => {
			try {
				await updateSavedView({
					pathParams: { id: view.id },
					data: {
						source,
						schemaVersion: SAVED_VIEW_SCHEMA_VERSION,
						spec: { ...view.spec, displayName },
					},
				});
				await invalidateSavedViews(queryClient, source, view.id);
				toast.success('View updated', { position: SAVED_VIEW_TOAST_POSITION });
				logSavedViewEvent(SavedViewEvents.ViewDetailsEdited, {
					[SavedViewEventKeys.ViewId]: view.id,
				});
				return true;
			} catch (error) {
				showErrorToast(error, 'Could not update the view');
				return false;
			}
		},
		[updateSavedView, source, queryClient, logSavedViewEvent],
	);

	// The deleted view's own query is left alone: refetching it would fail
	// while the header still has it selected.
	const deleteView = useCallback(
		async (view: SavedviewtypesSavedViewDTO): Promise<boolean> => {
			try {
				await deleteSavedView({ pathParams: { id: view.id } });
				await invalidateSavedViews(queryClient, source);
				toast.success('View deleted', { position: SAVED_VIEW_TOAST_POSITION });
				logSavedViewEvent(SavedViewEvents.ViewDeleted, {
					[SavedViewEventKeys.ViewId]: view.id,
				});
				return true;
			} catch (error) {
				showErrorToast(error, 'Could not delete the view');
				return false;
			}
		},
		[deleteSavedView, source, queryClient, logSavedViewEvent],
	);

	return {
		copyViewLink,
		copyViewId,
		renameView,
		deleteView,
		isRenaming,
		isDeleting,
	};
}
