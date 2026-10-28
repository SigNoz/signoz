import ROUTES from 'constants/routes';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';

import { buildExplorerNavigationUrl } from '../buildExplorerNavigationUrl';

describe('buildExplorerNavigationUrl', () => {
	it('encodes composite query and view selectors', () => {
		const url = buildExplorerNavigationUrl(
			ROUTES.LOGS_EXPLORER,
			{ queryType: 'builder' } as never,
			{
				[QueryParams.panelTypes]: PANEL_TYPES.LIST,
				[QueryParams.viewKey]: 'view-1',
			},
		);

		expect(url).toContain(ROUTES.LOGS_EXPLORER);
		expect(url).toContain(`${QueryParams.compositeQuery}=`);
		expect(url).toContain(`${QueryParams.viewKey}=`);
	});

	it('encodes the composite query for a reader that decodes it, even with a percent sign', () => {
		const query = {
			queryType: 'builder',
			filter: { expression: "body LIKE '%timeout%'" },
		} as never;

		const url = buildExplorerNavigationUrl(ROUTES.LOGS_EXPLORER, query, {});

		const param = new URL(url, window.location.origin).searchParams.get(
			QueryParams.compositeQuery,
		) as string;
		expect(JSON.parse(decodeURIComponent(param))).toStrictEqual(query);
	});
});
