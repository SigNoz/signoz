import ROUTES from 'constants/routes';
import { createInstance } from 'i18next';
import { ROLES, USER_ROLES } from 'types/roles';

import { getRoutes } from '../utils';

const i18n = createInstance();
void i18n.init({ lng: 'en', initImmediate: false, resources: {} });
const { t } = i18n;

const routeKeys = (role: ROLES, isWorkspaceBlocked: boolean): string[] =>
	getRoutes(role, false, false, isWorkspaceBlocked, true, false, t).map(
		(route) => route.key,
	);

describe('getRoutes for a blocked workspace', () => {
	it('keeps Members and Billing for a viewer, and nothing admin-only', () => {
		expect(routeKeys(USER_ROLES.VIEWER as ROLES, true)).toStrictEqual([
			ROUTES.MEMBERS_SETTINGS,
			ROUTES.BILLING,
		]);
	});

	it('adds Org Settings, My Settings and Shortcuts for an admin', () => {
		expect(routeKeys(USER_ROLES.ADMIN as ROLES, true)).toStrictEqual([
			ROUTES.ORG_SETTINGS,
			ROUTES.MEMBERS_SETTINGS,
			ROUTES.MY_SETTINGS,
			ROUTES.BILLING,
			ROUTES.SHORTCUTS,
		]);
	});
});

describe('getRoutes Ingestion tab', () => {
	it.each([
		['a cloud viewer', USER_ROLES.VIEWER, true, false],
		['an enterprise self-hosted viewer', USER_ROLES.VIEWER, false, true],
		['a community viewer', USER_ROLES.VIEWER, false, false],
		['an editor', USER_ROLES.EDITOR, true, false],
		['an admin', USER_ROLES.ADMIN, true, false],
	])(
		'is shown to %s',
		(_name, role, isCloudUser, isEnterpriseSelfHostedUser) => {
			const keys = getRoutes(
				role as ROLES,
				false,
				false,
				false,
				isCloudUser,
				isEnterpriseSelfHostedUser,
				t,
			).map((route) => route.key);

			expect(keys).toContain(ROUTES.INGESTION_SETTINGS);
		},
	);

	it('is hidden when the workspace is blocked', () => {
		expect(routeKeys(USER_ROLES.ADMIN as ROLES, true)).not.toContain(
			ROUTES.INGESTION_SETTINGS,
		);
	});
});
