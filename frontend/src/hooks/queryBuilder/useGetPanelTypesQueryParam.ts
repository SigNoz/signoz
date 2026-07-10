import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';

export function useGetPanelTypesQueryParam(
	defaultPanelType: PANEL_TYPES,
): PANEL_TYPES;
export function useGetPanelTypesQueryParam(
	defaultPanelType?: undefined,
): PANEL_TYPES | null;
export function useGetPanelTypesQueryParam(
	defaultPanelType?: PANEL_TYPES,
): PANEL_TYPES | null {
	const urlQuery = useUrlQuery();
	const panelTypeQuery = urlQuery.get(QueryParams.panelTypes);

	if (panelTypeQuery) {
		return JSON.parse(panelTypeQuery);
	}

	return defaultPanelType ?? null;
}
