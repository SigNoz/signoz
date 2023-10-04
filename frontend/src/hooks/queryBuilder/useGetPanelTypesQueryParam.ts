import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo } from 'react';

export const useGetPanelTypesQueryParam = <T extends PANEL_TYPES | undefined>(
	defaultPanelType?: T,
): T extends undefined ? PANEL_TYPES | null : PANEL_TYPES => {
	const urlQuery = useUrlQuery();

	return useMemo(() => {
		const panelTypeQuery = urlQuery.get(QueryParams.panelTypes);

		return panelTypeQuery ? JSON.parse(panelTypeQuery) : defaultPanelType;
	}, [urlQuery, defaultPanelType]);
};
