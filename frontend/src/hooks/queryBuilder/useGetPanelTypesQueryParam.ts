import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';

export function useGetPanelTypesQueryParam(
	defaultPanelType: PANEL_TYPES,
): PANEL_TYPES {
	const urlQuery = useUrlQuery();
	const panelTypeQuery = urlQuery.get(QueryParams.panelTypes);

	if (!panelTypeQuery) {
		return defaultPanelType;
	}

	try {
		const parsed: unknown = JSON.parse(panelTypeQuery);
		if (isPanelType(parsed)) {
			return parsed;
		}
	} catch {
		if (isPanelType(panelTypeQuery)) {
			return panelTypeQuery;
		}
	}

	return defaultPanelType;
}

function isPanelType(value: unknown): value is PANEL_TYPES {
	return Object.values(PANEL_TYPES).includes(value as PANEL_TYPES);
}
