import { useMemo } from 'react';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';

interface SavedViewParams {
	viewKey: string;
}

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
			viewKey: parseViewParam(urlQuery.get(QueryParams.viewKey)),
		}),
		[urlQuery],
	);
};
