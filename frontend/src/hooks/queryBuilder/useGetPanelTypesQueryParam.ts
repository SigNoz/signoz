import { useMemo } from 'react';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';

const isPanelType = (value: string): value is PANEL_TYPES =>
	(Object.values(PANEL_TYPES) as string[]).includes(value);

export const useGetPanelTypesQueryParam = <T extends PANEL_TYPES | undefined>(
	defaultPanelType?: T,
): T extends undefined ? PANEL_TYPES | null : PANEL_TYPES => {
	const urlQuery = useUrlQuery();

	return useMemo(() => {
		const panelTypeQuery = urlQuery.get(QueryParams.panelTypes);

		let panelType: PANEL_TYPES | null | undefined = defaultPanelType;

		if (panelTypeQuery) {
			// The explorers write the param JSON-encoded (`panelTypes="list"` via
			// `redirectWithQueryBuilderData`), while other producers — e.g. alert URL
			// builders, and the bookmarked/shared links carrying their plain
			// `panelTypes=graph` — write it as a bare string.
			try {
				const parsed = JSON.parse(panelTypeQuery) as unknown;
				if (typeof parsed === 'string' && isPanelType(parsed)) {
					panelType = parsed;
				}
			} catch {
				// Not JSON-encoded — fall through to the plain-string check below.
			}

			// Plain encoding. Anything else (unparseable junk, a well-formed value
			// that isn't a panel type, an absent param) falls back to the default,
			// same tolerance the time picker applies to this param.
			if (isPanelType(panelTypeQuery)) {
				panelType = panelTypeQuery;
			}
		}

		return (panelType ?? null) as T extends undefined
			? PANEL_TYPES | null
			: PANEL_TYPES;
	}, [urlQuery, defaultPanelType]);
};
