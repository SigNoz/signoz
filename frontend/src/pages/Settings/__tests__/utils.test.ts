import ROUTES from 'constants/routes';
import { createInstance } from 'i18next';
import { ROLES, USER_ROLES } from 'types/roles';

import { getRoutes } from '../utils';

const i18n = createInstance();
void i18n.init({ lng: 'en', initImmediate: false, resources: {} });
const { t } = i18n;

const routeKeys = (role: ROLES, isWorkspaceBlocked: boolean): string[] =>
	getRoutes(role, false, isWorkspaceBlocked, true, false, t).map(
		(route) => route.key,
	);

describe('getRoutes for a blocked workspace', () => {
	it('keeps Org Settings, Members and Billing for a viewer, and nothing admin-only', () => {
		expect(routeKeys(USER_ROLES.VIEWER as ROLES, true)).toStrictEqual([
			ROUTES.ORG_SETTINGS,
			ROUTES.MEMBERS_SETTINGS,
			ROUTES.BILLING,
		]);
	});

	it('adds My Settings and Shortcuts for an admin', () => {
		expect(routeKeys(USER_ROLES.ADMIN as ROLES, true)).toStrictEqual([
			ROUTES.ORG_SETTINGS,
			ROUTES.MEMBERS_SETTINGS,
			ROUTES.MY_SETTINGS,
			ROUTES.BILLING,
			ROUTES.SHORTCUTS,
		]);
	});
});

describe('getRoutes for an unblocked workspace', () => {
	it.each([USER_ROLES.ADMIN, USER_ROLES.EDITOR, USER_ROLES.VIEWER])(
		'lists Org Settings for %s',
		(role) => {
			expect(routeKeys(role as ROLES, false)).toContain(ROUTES.ORG_SETTINGS);
		},
	);
});
