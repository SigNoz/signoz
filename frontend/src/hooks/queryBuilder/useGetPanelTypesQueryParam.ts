import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo } from 'react';

export const useGetPanelTypesQueryParam = <T extends GRAPH_TYPES | undefined>(
	defaultPanelType?: T,
): T extends undefined ? GRAPH_TYPES | null : GRAPH_TYPES => {
	const urlQuery = useUrlQuery();

	return useMemo(() => {
		const panelTypeQuery = urlQuery.get(queryParamNamesMap.panelTypes);

		return panelTypeQuery ? JSON.parse(panelTypeQuery) : defaultPanelType;
	}, [urlQuery, defaultPanelType]);
};
