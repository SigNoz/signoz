import type { Page } from '@playwright/test';

import { authToken } from './dashboards';

export type Tier =
	| 'cloud'
	| 'enterprise'
	| 'community'
	| 'community-enterprise';
export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'ANONYMOUS';

export interface Persona {
	tier: Tier;
	role: Role;
}

export interface SettingsEnv {
	isGatewayEnabled: boolean;
}

interface AuthzCheckItem {
	authorized?: boolean;
	object?: { selector?: string };
}

interface FeatureFlag {
	name?: string;
	active?: boolean;
}

const LICENSE_URL = '/api/v3/licenses/active';
const AUTHZ_CHECK_URL = '/api/v1/authz/check';
const FEATURES_URL = '/api/v1/features';

// Mirrors IsAdmin/Editor/Viewer in frontend/src/hooks/useAuthZ/legacy.ts:
// relation 'assignee' on resource kind/type 'role', selector = preset role id.
const ROLE_PROBES: { role: Exclude<Role, 'ANONYMOUS'>; selector: string }[] = [
	{ role: 'ADMIN', selector: 'signoz-admin' },
	{ role: 'EDITOR', selector: 'signoz-editor' },
	{ role: 'VIEWER', selector: 'signoz-viewer' },
];

function authHeaders(token: string): Record<string, string> {
	return { Authorization: `Bearer ${token}` };
}

function parseOverride(): Persona | null {
	const raw = process.env.SIGNOZ_E2E_PERSONA;
	if (!raw) {
		return null;
	}
	const parts = raw.toLowerCase().split('-');
	const roleRaw = parts.pop();
	const tier = parts.join('-') as Tier;
	const role = roleRaw?.toUpperCase() as Role;
	return { tier, role };
}

async function detectTier(page: Page, token: string): Promise<Tier> {
	const res = await page.request.get(LICENSE_URL, {
		headers: authHeaders(token),
	});
	if (res.status() === 404) {
		return 'community-enterprise';
	}
	if (res.status() === 501) {
		return 'community';
	}
	const body = await res.json();
	const platform = body?.data?.platform;
	if (platform === 'CLOUD') {
		return 'cloud';
	}
	return 'enterprise';
}

async function detectRole(page: Page, token: string): Promise<Role> {
	const payload = ROLE_PROBES.map((p) => ({
		relation: 'assignee',
		object: {
			resource: { kind: 'role', type: 'role' },
			selector: p.selector,
		},
	}));
	const res = await page.request.post(AUTHZ_CHECK_URL, {
		headers: authHeaders(token),
		data: payload,
	});
	const body = await res.json();
	const items: AuthzCheckItem[] = body?.data ?? [];
	const granted = new Set(
		items.filter((i) => i?.authorized).map((i) => i?.object?.selector),
	);
	for (const p of ROLE_PROBES) {
		if (granted.has(p.selector)) {
			return p.role;
		}
	}
	return 'ANONYMOUS';
}

export async function detectPersona(page: Page): Promise<Persona> {
	const override = parseOverride();
	if (override) {
		return override;
	}
	const token = await authToken(page);
	const [tier, role] = await Promise.all([
		detectTier(page, token),
		detectRole(page, token),
	]);
	return { tier, role };
}

export async function detectSettingsEnv(page: Page): Promise<SettingsEnv> {
	const token = await authToken(page);
	const res = await page.request.get(FEATURES_URL, {
		headers: authHeaders(token),
	});
	const body = await res.json();
	const flags: FeatureFlag[] = body?.data ?? [];
	const gateway = flags.find((f) => f?.name === 'gateway');
	return { isGatewayEnabled: !!gateway?.active };
}
