import { useEffect, useMemo, useRef } from 'react';
import { useGetSavedView } from 'api/generated/services/saved-view';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useOptionsMenu from 'container/OptionsMenu/useOptionsMenu';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetSavedViewParams } from 'hooks/saveViews/useGetSavedViewParams';
import { buildSavedViewReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { DataSource } from 'types/common/queryBuilder';
import { toAPIError } from 'utils/errorUtils';

import { getSavedViewPreferenceDataSource } from '../constants';
import { UseActiveSavedViewResult } from '../types';
import { hasUnsavedViewChanges } from '../utils/hasUnsavedViewChanges';

export function useActiveSavedView(
	source: SavedviewtypesSourceDTO,
): UseActiveSavedViewResult {
	const { viewKey } = useGetSavedViewParams();
	const { stagedQuery, panelType } = useQueryBuilder();

	const optionsDataSource = getSavedViewPreferenceDataSource(
		source,
		panelType ?? undefined,
	);
	const { options } = useOptionsMenu({
		dataSource: optionsDataSource ?? DataSource.LOGS,
	});

	const { isLoading: isCheckingRead, deniedPermissions } = useAuthZ(
		[buildSavedViewReadPermission(viewKey)],
		{ enabled: !!viewKey },
	);
	const isReadDenied = !!viewKey && deniedPermissions.length > 0;

	const canFetch = !!viewKey && !isCheckingRead && !isReadDenied;

	const { data, isLoading, isError, error } = useGetSavedView(
		{ id: viewKey },
		{ query: { enabled: canFetch } },
	);
	const view = canFetch ? data?.data : undefined;

	// The query builder stages the url query a render later. Until the ids
	// match, keep the last answer for this view; another view starts clean.
	const compositeQuery = useGetCompositeQueryParam();
	const isStagedQueryCurrent =
		!!stagedQuery && stagedQuery.id === compositeQuery?.id;
	const lastResult = useRef<{ viewId?: string; hasUnsavedChanges: boolean }>({
		hasUnsavedChanges: false,
	});

	const hasUnsavedChanges = useMemo((): boolean => {
		if (!view || isError) {
			return false;
		}
		if (!isStagedQueryCurrent) {
			return (
				lastResult.current.viewId === view.id &&
				lastResult.current.hasUnsavedChanges
			);
		}
		return hasUnsavedViewChanges({
			view,
			stagedQuery,
			panelType: panelType ?? PANEL_TYPES.LIST,
			options: optionsDataSource ? options : undefined,
			optionsDataSource,
		});
	}, [
		view,
		isError,
		isStagedQueryCurrent,
		stagedQuery,
		panelType,
		optionsDataSource,
		options,
	]);

	useEffect(() => {
		lastResult.current = { viewId: view?.id, hasUnsavedChanges };
	}, [view?.id, hasUnsavedChanges]);

	const errorMessage =
		viewKey && isError && error
			? toAPIError(error, '').getErrorMessage() || undefined
			: undefined;

	return {
		view,
		isLoading: !!viewKey && (isCheckingRead || isLoading),
		isError: !!viewKey && (isError || isReadDenied),
		isReadDenied,
		errorMessage,
		hasUnsavedChanges,
	};
}
