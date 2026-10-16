import { useEffect, useMemo, useRef } from 'react';
import { useGetSavedView } from 'api/generated/services/saved-view';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useOptionsMenu from 'container/OptionsMenu/useOptionsMenu';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetSavedViewParams } from 'hooks/saveViews/useGetSavedViewParams';
import { DataSource } from 'types/common/queryBuilder';

import { SAVED_VIEW_OPTIONS_DATA_SOURCE } from '../constants';
import { UseActiveSavedViewResult } from '../types';
import { hasUnsavedViewChanges } from '../utils/hasUnsavedViewChanges';

export function useActiveSavedView(
	source: SavedviewtypesSourceDTO,
): UseActiveSavedViewResult {
	const { viewKey } = useGetSavedViewParams();
	const { stagedQuery, panelType } = useQueryBuilder();

	const optionsDataSource = SAVED_VIEW_OPTIONS_DATA_SOURCE[source];
	const { options } = useOptionsMenu({
		dataSource: optionsDataSource ?? DataSource.LOGS,
	});

	const { data, isLoading, isError } = useGetSavedView(
		{ id: viewKey },
		{ query: { enabled: !!viewKey } },
	);
	const view = viewKey ? data?.data : undefined;

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

	return {
		view,
		isLoading: !!viewKey && isLoading,
		isError: !!viewKey && isError,
		hasUnsavedChanges,
	};
}
