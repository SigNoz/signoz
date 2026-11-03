import ROUTES from 'constants/routes';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';

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

	it('JSON-encodes panelTypes so the explorer opens the right view', () => {
		const url = buildExplorerNavigationUrl(
			ROUTES.LOGS_EXPLORER,
			initialQueriesMap[DataSource.LOGS],
			{ [QueryParams.panelTypes]: PANEL_TYPES.TABLE },
		);

		expect(url).toContain(`${QueryParams.panelTypes}=%22table%22`);
	});
});
