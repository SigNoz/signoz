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
});
