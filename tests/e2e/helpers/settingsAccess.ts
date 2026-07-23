import type { Persona, SettingsEnv, Tier } from './persona';
import { SETTINGS_ROUTES, NAV_TESTID } from './settings';

// Mirrors the isEnabled effect in frontend/src/pages/Settings/Settings.tsx.
// Returns the set of sidenav item testids (itemKeys) that should be visible.
export function visibleNavItems(
	persona: Persona,
	_env: SettingsEnv,
): Set<string> {
	const { tier, role } = persona;
	const isAdmin = role === 'ADMIN';
	const isEditor = role === 'EDITOR';
	const isViewer = role === 'VIEWER';

	// Defaults that start enabled in menuItems.tsx settingsNavSections.
	const s = new Set<string>([
		'workspace',
		'account',
		'notification-channels',
		'keyboard-shortcuts',
	]);

	const enableForAllUsers = (): void => {
		s.add('roles');
		s.add('service-accounts');
	};

	if (tier === 'cloud') {
		enableForAllUsers();
		if (isAdmin) {
			[
				'billing',
				'integrations',
				'ingestion',
				'sso',
				'members',
				'mcp-server',
			].forEach((k) => s.add(k));
		}
		if (isEditor) {
			['ingestion', 'integrations', 'mcp-server'].forEach((k) => s.add(k));
		}
		if (isViewer) {
			s.add('mcp-server');
		}
		return s;
	}

	if (tier === 'enterprise') {
		enableForAllUsers();
		if (isAdmin) {
			[
				'billing',
				'integrations',
				'sso',
				'members',
				'ingestion',
				'mcp-server',
			].forEach((k) => s.add(k));
		}
		if (isEditor) {
			['integrations', 'ingestion', 'mcp-server'].forEach((k) => s.add(k));
		}
		if (isViewer) {
			s.add('mcp-server');
		}
		return s;
	}

	// community / community-enterprise (!cloud && !enterprise)
	enableForAllUsers();
	if (isAdmin) {
		s.add('sso');
		s.add('members');
	}
	// billing & integrations explicitly disabled for non-cloud users.
	s.delete('billing');
	s.delete('integrations');
	return s;
}

// Mirrors getRoutes() in frontend/src/pages/Settings/utils.ts.
// Returns the set of /settings route paths that are mounted (navigable).
export function registeredRoutes(
	persona: Persona,
	env: SettingsEnv,
): Set<string> {
	const { tier, role } = persona;
	const isAdmin = role === 'ADMIN';
	const isEditor = role === 'EDITOR';
	const isCloud = tier === 'cloud';
	const isEnterprise = tier === 'enterprise';

	const r = new Set<string>([
		SETTINGS_ROUTES.WORKSPACE, // generalSettings — always
		SETTINGS_ROUTES.ALL_CHANNELS, // always
		SETTINGS_ROUTES.SERVICE_ACCOUNTS, // always
		SETTINGS_ROUTES.ROLES, // always
		SETTINGS_ROUTES.MY_SETTINGS, // always
		SETTINGS_ROUTES.SHORTCUTS, // always
		SETTINGS_ROUTES.MCP_SERVER, // always
	]);

	// organizationSettings — gated by current_org_settings; mirrored as admin-only.
	if (isAdmin) {
		r.add(SETTINGS_ROUTES.ORG_SETTINGS);
	}
	// multiIngestionSettings if gateway && (admin||editor); cloud read-only if cloud && !gateway.
	if (
		(env.isGatewayEnabled && (isAdmin || isEditor)) ||
		(isCloud && !env.isGatewayEnabled)
	) {
		r.add(SETTINGS_ROUTES.INGESTION);
	}
	// membersSettings if admin.
	if (isAdmin) {
		r.add(SETTINGS_ROUTES.MEMBERS);
	}
	// billing if (cloud||enterprise) && admin.
	if ((isCloud || isEnterprise) && isAdmin) {
		r.add(SETTINGS_ROUTES.BILLING);
	}
	return r;
}

// Skip reason when a route's nav item is hidden for the persona; null when
// visible. Centralised so every skip reads identically and is greppable.
export function personaSkipReason(
	persona: Persona,
	env: SettingsEnv,
	route: string,
): string | null {
	const visible = visibleNavItems(persona, env);
	const testid = NAV_TESTID[route];
	if (testid && visible.has(testid)) {
		return null;
	}
	return `PERSONA_SKIP: ${route} hidden for ${persona.tier}×${persona.role}`;
}

// Second skip axis: a route is visible but renders tier-specific CONTENT (e.g.
// /settings shows a cloud support card vs self-hosted retention controls).
// Gates a test to the tiers whose content it asserts. Shares the PERSONA_SKIP:
// prefix.
export function tierSkipReason(
	persona: Persona,
	allowedTiers: Tier[],
	label: string,
): string | null {
	if (allowedTiers.includes(persona.tier)) {
		return null;
	}
	return `PERSONA_SKIP: ${label} not applicable for tier ${persona.tier} (needs ${allowedTiers.join(
		'|',
	)})`;
}
