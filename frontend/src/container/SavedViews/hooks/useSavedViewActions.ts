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
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
import { toAPIError } from 'utils/errorUtils';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';

import {
	SAVED_VIEW_SCHEMA_VERSION,
	SAVED_VIEW_TOAST_POSITION,
	SAVED_VIEW_URL_PARAMS,
} from '../constants';
import { UseSavedViewActionsResult } from '../types';
import {
	getPreferenceSlice,
	getSavedViewPreferenceSource,
} from '../utils/getSavedViewPreferenceSource';
import { getSavedViewQuery } from '../utils/getSavedViewQuery';
import { getViewColumnsAndFormatting } from '../utils/getViewColumnsAndFormatting';
import { invalidateSavedViews } from '../utils/invalidateSavedViews';
import { toSavedViewSpec } from '../utils/toSavedViewSpec';
import { useLastUsedView } from './useLastUsedView';
import { useSavedViewOptions } from './useSavedViewOptions';

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

	const { options } = useSavedViewOptions(source, panelType);
	const preferences = usePreferenceContext();

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
				panelType: panelType ?? PANEL_TYPES.LIST,
				displayName,
				options,
				color,
			}),
		[stagedQuery, currentQuery, panelType, options],
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
			const viewPreferenceSource = getSavedViewPreferenceSource(
				source,
				view.spec.panelType,
			);
			const viewPreferencesSlice = getPreferenceSlice(
				preferences,
				viewPreferenceSource,
			);
			if (viewPreferenceSource && viewPreferencesSlice) {
				const { columns, formatting } = getViewColumnsAndFormatting(
					view.spec,
					viewPreferenceSource,
				);
				viewPreferencesSlice.updateColumns(columns);
				if (formatting) {
					viewPreferencesSlice.updateFormatting(formatting);
				}
			}
			selectView(view);
		},
		[source, preferences, selectView],
	);

	// The query builder redirects only ever add params, so the url is rebuilt
	// here; the time range and everything else a view does not set stays.
	const clearView = useCallback((): void => {
		clearLastUsedView();

		const params = getUnstableCurrentSearchParams();
		SAVED_VIEW_URL_PARAMS.forEach((param) => params.delete(param));
		safeNavigate(`${pathname}?${params.toString()}`);
	}, [clearLastUsedView, pathname, safeNavigate]);

	const createView = useCallback(
		async (displayName: string): Promise<string | undefined> => {
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
		[updateSavedView, source, toCurrentSpec, invalidateViews],
	);

	return {
		selectView,
		revertView,
		clearView,
		createView,
		updateView,
		isSaving: isCreating || isUpdating,
	};
}
