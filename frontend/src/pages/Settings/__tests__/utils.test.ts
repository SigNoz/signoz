import ROUTES from 'constants/routes';
import { createInstance } from 'i18next';
import { ROLES, USER_ROLES } from 'types/roles';

import { ingestionSettings, multiIngestionSettings } from '../config';
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

const ingestionComponents = (
	role: ROLES,
	isGatewayEnabled: boolean,
	isCloudUser: boolean,
	isEnterpriseSelfHostedUser: boolean,
): unknown[] =>
	getRoutes(
		role,
		isGatewayEnabled,
		false,
		isCloudUser,
		isEnterpriseSelfHostedUser,
		t,
	)
		.filter((route) => route.key === ROUTES.INGESTION_SETTINGS)
		.map((route) => route.Component);

describe('getRoutes Ingestion tab', () => {
	const multi = multiIngestionSettings(t)[0].Component;
	const legacy = ingestionSettings(t)[0].Component;

	it.each([USER_ROLES.VIEWER, USER_ROLES.EDITOR, USER_ROLES.ADMIN])(
		'shows the multi key page to a %s when the gateway is on',
		(role) => {
			expect(ingestionComponents(role as ROLES, true, true, false)).toStrictEqual([
				multi,
			]);
		},
	);

	it('shows the legacy page to cloud users without the gateway', () => {
		expect(
			ingestionComponents(USER_ROLES.VIEWER as ROLES, false, true, false),
		).toStrictEqual([legacy]);
	});

	it.each([
		['enterprise self-hosted', false, true],
		['community', false, false],
	])(
		'shows no Ingestion tab to %s users without the gateway',
		(_n, cloud, ent) => {
			expect(
				ingestionComponents(USER_ROLES.ADMIN as ROLES, false, cloud, ent),
			).toStrictEqual([]);
		},
	);

	it('is hidden when the workspace is blocked', () => {
		expect(routeKeys(USER_ROLES.ADMIN as ROLES, true)).not.toContain(
			ROUTES.INGESTION_SETTINGS,
		);
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
