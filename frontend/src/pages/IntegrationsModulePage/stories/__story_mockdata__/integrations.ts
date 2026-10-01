/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	AllIntegrationsProps,
	IntegrationsProps,
} from 'types/api/integrations/types';

export const INSTALLATION_MIXES = ['mixed', 'all', 'none'] as const;
export type InstallationMix = (typeof INSTALLATION_MIXES)[number];

/**
 * The backend base64-encodes each integration's `icon.svg` into a data URI
 * (`readFileIfUri` in `pkg/query-service/app/integrations/builtin.go`), so the
 * mocks answer with data URIs too and no story reaches for an image on a host
 * msw does not answer on.
 */
export const monogramIcon = (label: string, background: string): string => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${background}"/><text x="16" y="21" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#ffffff">${label}</text></svg>`;

	return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const SIGNOZ_AUTHOR = {
	name: 'SigNoz',
	email: 'integrations@signoz.io',
	homepage: 'https://signoz.io',
};

export interface IntegrationSeed {
	id: string;
	title: string;
	description: string;
	categories: readonly string[];
	icon: string;
	/** Whether the `mixed` installation value has this one already installed. */
	installed: boolean;
	/** Which of the two Data Collected tables the integration fills. */
	signals: { readonly logs: boolean; readonly metrics: boolean };
}

/**
 * The built-in integrations, ordered by id the way `BuiltInIntegrations.list`
 * sorts them, so a slice of the first N is the page the backend would answer
 * with.
 */
const INTEGRATION_CATALOGUE = [
	{
		id: 'aws_elasticache_redis',
		title: 'AWS ElastiCache (redis)',
		description: 'Monitor AWS ElastiCache with metrics and logs',
		categories: ['Database'],
		icon: monogramIcon('EC', '#8C4FFF'),
		installed: false,
		signals: { logs: true, metrics: true },
	},
	{
		id: 'aws_rds_mysql',
		title: 'AWS RDS (MySQL)',
		description: 'Monitor AWS RDS (MySQL) with metrics and logs',
		categories: ['Database'],
		icon: monogramIcon('MY', '#00758F'),
		installed: false,
		signals: { logs: true, metrics: true },
	},
	{
		id: 'aws_rds_postgresql',
		title: 'AWS RDS (PostgreSQL)',
		description: 'Monitor AWS RDS (PostgreSQL) with metrics and logs',
		categories: ['Database'],
		icon: monogramIcon('RDS', '#2F6FAF'),
		installed: true,
		signals: { logs: true, metrics: true },
	},
	{
		id: 'clickhouse',
		title: 'Clickhouse',
		description: 'Monitor Clickhouse with metrics and logs',
		categories: ['Database'],
		icon: monogramIcon('CH', '#C7770B'),
		installed: false,
		signals: { logs: true, metrics: true },
	},
	{
		id: 'mongo',
		title: 'Mongo',
		description: 'Monitor mongo using logs and metrics.',
		categories: ['Database'],
		icon: monogramIcon('MG', '#13AA52'),
		installed: true,
		signals: { logs: true, metrics: true },
	},
	{
		id: 'nginx',
		title: 'Nginx',
		description: 'Monitor nginx using logs and metrics.',
		categories: ['Ingress', 'HTTP'],
		icon: monogramIcon('NX', '#009639'),
		installed: true,
		signals: { logs: true, metrics: false },
	},
	{
		id: 'postgres',
		title: 'PostgreSQL',
		description: 'Monitor Postgres with metrics and logs',
		categories: ['Database'],
		icon: monogramIcon('PG', '#336791'),
		installed: false,
		signals: { logs: true, metrics: true },
	},
	{
		id: 'redis',
		title: 'Redis',
		description: 'Monitor redis with metrics and logs',
		categories: ['Database'],
		icon: monogramIcon('RD', '#C6302B'),
		installed: true,
		signals: { logs: true, metrics: true },
	},
] as const satisfies readonly IntegrationSeed[];

export type IntegrationId = (typeof INTEGRATION_CATALOGUE)[number]['id'];

export const INTEGRATION_IDS: readonly IntegrationId[] =
	INTEGRATION_CATALOGUE.map((seed) => seed.id);

export const INTEGRATION_CATALOGUE_SIZE = INTEGRATION_CATALOGUE.length;

export const findIntegrationSeed = (id: string): IntegrationSeed =>
	INTEGRATION_CATALOGUE.find((seed) => seed.id === id) ??
	INTEGRATION_CATALOGUE[0];

const isInstalled = (
	seed: IntegrationSeed,
	installation: InstallationMix,
): boolean => {
	if (installation === 'all') {
		return true;
	}
	if (installation === 'none') {
		return false;
	}

	return seed.installed;
};

const summary = (
	seed: IntegrationSeed,
	installation: InstallationMix,
): IntegrationsProps => ({
	id: seed.id,
	title: seed.title,
	description: seed.description,
	icon: seed.icon,
	author: SIGNOZ_AUTHOR,
	is_installed: isInstalled(seed, installation),
});

export const allIntegrationsResponse = (
	count: number,
	installation: InstallationMix,
): AllIntegrationsProps => ({
	status: 'success',
	data: {
		integrations: INTEGRATION_CATALOGUE.slice(0, count).map((seed) =>
			summary(seed, installation),
		),
	},
});
