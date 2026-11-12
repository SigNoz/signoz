import ROUTES from 'constants/routes';
import { TFunction } from 'i18next';
import { ROLES, USER_ROLES } from 'types/roles';

import { getRoutes } from '../utils';

const t = ((key: string): string => key) as unknown as TFunction;

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
