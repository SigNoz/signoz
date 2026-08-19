import { useMemo } from 'react';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';

const PANEL_TYPE_VALUES = new Set<string>(Object.values(PANEL_TYPES));

// The param is JSON encoded by the explorers and written as a plain string by the
// alerts flow, so accept both and treat anything unrecognised as absent.
const parsePanelType = (value: string): PANEL_TYPES | null => {
	let parsed: unknown = value;

	try {
		parsed = JSON.parse(value);
	} catch {
		parsed = value;
	}

	return typeof parsed === 'string' && PANEL_TYPE_VALUES.has(parsed)
		? (parsed as PANEL_TYPES)
		: null;
};

export const useGetPanelTypesQueryParam = <T extends PANEL_TYPES | undefined>(
	defaultPanelType?: T,
): T extends undefined ? PANEL_TYPES | null : PANEL_TYPES => {
	const urlQuery = useUrlQuery();

	return useMemo(() => {
		const panelTypeQuery = urlQuery.get(QueryParams.panelTypes);

		return (
			(panelTypeQuery ? parsePanelType(panelTypeQuery) : null) ?? defaultPanelType
		);
	}, [urlQuery, defaultPanelType]) as T extends undefined
		? PANEL_TYPES | null
		: PANEL_TYPES;
};
