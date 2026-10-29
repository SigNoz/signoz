import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { useLocation } from 'react-router-dom';
import { toast } from '@signozhq/ui/sonner';
import {
	useCreateSavedView,
	useUpdateSavedView,
} from 'api/generated/services/saved-view';
import {
	RenderErrorResponseDTO,
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSavedViewSpecDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useOptionsMenu from 'container/OptionsMenu/useOptionsMenu';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetSavedViewParams } from 'hooks/saveViews/useGetSavedViewParams';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { usePreferenceSlice } from 'providers/preferences/context/usePreferenceSlice';
import {
	hasPreferences,
	isPreferenceSourcePage,
} from 'providers/preferences/utils';
import { toAPIError } from 'utils/errorUtils';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';

import {
	SAVED_VIEW_SCHEMA_VERSION,
	SAVED_VIEW_TOAST_POSITION,
	SAVED_VIEW_URL_PARAMS,
} from '../constants';
import {
	SavedViewCreatedFrom,
	SavedViewEventKeys,
	SavedViewEvents,
} from '../events';
import { UseSavedViewActionsResult } from '../types';
import { getSavedViewQuery } from '../utils/getSavedViewQuery';
import { getViewColumnsAndFormatting } from '../utils/getViewColumnsAndFormatting';
import { invalidateSavedViews } from '../utils/invalidateSavedViews';
import { toSavedViewSpec } from '../utils/toSavedViewSpec';
import { useLastUsedView } from './useLastUsedView';
import { useSavedViewLogEvent } from './useSavedViewLogEvent';

// Columns and formatting need no handling here: with a viewKey in the url the
// preference provider reads them from the view, and without one it falls back
// to the user's own.
export function useSavedViewActions(
	source: SavedviewtypesSourceDTO,
): UseSavedViewActionsResult {
	const queryClient = useQueryClient();
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const { currentQuery, stagedQuery, panelType, redirectWithQueryBuilderData } =
		useQueryBuilder();
	const { handleExplorerTabChange } = useHandleExplorerTabChange();
	const { setLastUsedView, clearLastUsedView } = useLastUsedView(source);
	const { viewKey } = useGetSavedViewParams();
	const logSavedViewEvent = useSavedViewLogEvent(source);

	const viewPanelType = panelType ?? PANEL_TYPES.LIST;
	const hasOptions = hasPreferences(source, viewPanelType);
	const { options } = useOptionsMenu({
		sourcePage: isPreferenceSourcePage(source)
			? source
			: SavedviewtypesSourceDTO.logs,
	});
	const preferenceSlice = usePreferenceSlice(source);

	const { mutateAsync: createSavedView, isLoading: isCreating } =
		useCreateSavedView();
	const { mutateAsync: updateSavedView, isLoading: isUpdating } =
		useUpdateSavedView();

	const invalidateViews = useCallback(
		(id?: string): Promise<void> => invalidateSavedViews(queryClient, source, id),
		[queryClient, source],
	);

	const toCurrentSpec = useCallback(
		(displayName: string, color?: string): SavedviewtypesSavedViewSpecDTO =>
			toSavedViewSpec({
				query: stagedQuery ?? currentQuery,
				panelType: viewPanelType,
				displayName,
				options: hasOptions ? options : undefined,
				color,
			}),
		[stagedQuery, currentQuery, viewPanelType, hasOptions, options],
	);

	const selectView = useCallback(
		(view: SavedviewtypesSavedViewDTO): void => {
			handleExplorerTabChange(view.spec.panelType, {
				query: getSavedViewQuery(view),
				viewKey: view.id,
			});
			setLastUsedView(view.id, view.spec.displayName);
		},
		[handleExplorerTabChange, setLastUsedView],
	);

	const revertView = useCallback(
		(view: SavedviewtypesSavedViewDTO): void => {
			if (preferenceSlice) {
				const { columns, formatting, panelType } = getViewColumnsAndFormatting(
					view.spec,
					source,
				);
				preferenceSlice.updateColumns(columns, panelType);
				if (formatting) {
					preferenceSlice.updateFormatting(formatting);
				}
			}
			selectView(view);
			logSavedViewEvent(SavedViewEvents.ChangesDiscarded, {
				[SavedViewEventKeys.ViewId]: view.id,
			});
		},
		[source, preferenceSlice, selectView, logSavedViewEvent],
	);

	// The query builder redirects only ever add params, so the url is rebuilt
	// here; the time range and everything else a view does not set stays.
	const resetView = useCallback((): void => {
		clearLastUsedView();

		const params = getUnstableCurrentSearchParams();
		SAVED_VIEW_URL_PARAMS.forEach((param) => params.delete(param));
		safeNavigate(`${pathname}?${params.toString()}`);
	}, [clearLastUsedView, pathname, safeNavigate]);

	const clearView = useCallback((): void => {
		resetView();
		logSavedViewEvent(SavedViewEvents.ViewCleared, {
			[SavedViewEventKeys.ViewId]: viewKey,
		});
	}, [resetView, logSavedViewEvent, viewKey]);

	const createView = useCallback(
		async (
			displayName: string,
			from: SavedViewCreatedFrom,
		): Promise<string | undefined> => {
			try {
				const { data } = await createSavedView({
					data: {
						generateName: true,
						source,
						schemaVersion: SAVED_VIEW_SCHEMA_VERSION,
						spec: toCurrentSpec(displayName),
					},
				});
				await invalidateViews();
				redirectWithQueryBuilderData(stagedQuery ?? currentQuery, {
					[QueryParams.viewKey]: data.id,
				});
				setLastUsedView(data.id, displayName);
				logSavedViewEvent(SavedViewEvents.ViewCreated, {
					[SavedViewEventKeys.ViewId]: data.id,
					[SavedViewEventKeys.From]: from,
				});
				return data.id;
			} catch (error) {
				toast.error(
					toAPIError(
						error as ErrorType<RenderErrorResponseDTO>,
						'Could not save the view',
					).getErrorMessage(),
					{ position: SAVED_VIEW_TOAST_POSITION },
				);
				return undefined;
			}
		},
		[
			createSavedView,
			source,
			toCurrentSpec,
			invalidateViews,
			redirectWithQueryBuilderData,
			stagedQuery,
			currentQuery,
			setLastUsedView,
			logSavedViewEvent,
		],
	);

	const updateView = useCallback(
		async (view: SavedviewtypesSavedViewDTO): Promise<boolean> => {
			try {
				await updateSavedView({
					pathParams: { id: view.id },
					data: {
						source,
						schemaVersion: SAVED_VIEW_SCHEMA_VERSION,
						spec: toCurrentSpec(view.spec.displayName, view.spec.display?.color),
					},
				});
				await invalidateViews(view.id);
				logSavedViewEvent(SavedViewEvents.ViewUpdated, {
					[SavedViewEventKeys.ViewId]: view.id,
				});
				return true;
			} catch (error) {
				toast.error(
					toAPIError(
						error as ErrorType<RenderErrorResponseDTO>,
						'Could not update the view',
					).getErrorMessage(),
					{ position: SAVED_VIEW_TOAST_POSITION },
				);
				return false;
			}
		},
		[updateSavedView, source, toCurrentSpec, invalidateViews, logSavedViewEvent],
	);

	return {
		selectView,
		revertView,
		clearView,
		resetView,
		createView,
		updateView,
		isSaving: isCreating || isUpdating,
	};
}
