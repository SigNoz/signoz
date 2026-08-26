import { useMemo } from 'react';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';

interface SavedViewParams {
	viewName: string;
	viewKey: string;
}

// viewName/viewKey are plain strings, but writers JSON.stringify them onto the
// URL. When a link is re-linkified in transit (Slack, email, proxies) the encoded
// quotes can be stripped, leaving a bare string that JSON.parse throws on. Fall
// back to the raw value so a mangled link can't crash the page.
const parseViewParam = (value: string | null): string => {
	if (!value) {
		return '';
	}

	try {
		const parsed = JSON.parse(value);
		return typeof parsed === 'string' ? parsed : value;
	} catch {
		return value;
	}
};

export const useGetSavedViewParams = (): SavedViewParams => {
	const urlQuery = useUrlQuery();

	return useMemo(
		() => ({
			viewName: parseViewParam(urlQuery.get(QueryParams.viewName)),
			viewKey: parseViewParam(urlQuery.get(QueryParams.viewKey)),
		}),
		[urlQuery],
	);
};
