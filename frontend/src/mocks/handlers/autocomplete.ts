import { mockAttributeKeys } from 'mocks/data/mockAttributeKeys';
import { PathParams, rest, RestHandler } from 'msw';
import { IGetAttributeKeysPayload } from 'types/api/queryBuilder/getAttributeKeys';
import { IQueryAutocompleteResponse } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { createApiUrl } from 'utils/createApiUrl';

export const autocompleteAttributeKeysHandler: RestHandler = rest.get<
	{ data: IQueryAutocompleteResponse },
	PathParams<keyof IGetAttributeKeysPayload>,
	{ data: IQueryAutocompleteResponse }
>(createApiUrl('autocomplete/attribute_keys'), (req, res, ctx) => {
	const searchText = req.url.searchParams.get('searchText') || '';

	const filteredMockItems: {
		data: IQueryAutocompleteResponse;
	} = {
		data: {
			attributeKeys:
				mockAttributeKeys.data.attributeKeys?.filter((item) =>
					item.key.includes(searchText),
				) || [],
		},
	};

	return res(ctx.status(200), ctx.json(filteredMockItems));
});

export const autocompleteHandlers: RestHandler[] = [
	autocompleteAttributeKeysHandler,
];
