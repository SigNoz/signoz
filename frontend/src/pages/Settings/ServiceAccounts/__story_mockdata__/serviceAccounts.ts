/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	CreateServiceAccount201,
	CreateServiceAccountKey201,
	GetServiceAccount200,
	ListServiceAccountKeys200,
	ListServiceAccounts200,
	RenderErrorResponseDTO,
	ServiceaccounttypesServiceAccountDTO,
	ServiceaccounttypesServiceAccountRoleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ServiceAccountStatus } from 'container/ServiceAccountsSettings/utils';
import { RoleType } from 'types/roles';

/** Past the table's own page size of 20, so a story can reach the second page. */
export const ACTIVE_ACCOUNT_MAX = 24;
export const DELETED_ACCOUNT_MAX = 4;
/** Past the Keys tab's page size of 15, for the same reason. */
export const KEY_MAX = 20;

/** One per account the two counts can produce, so no name is ever reused. */
const ACCOUNT_NAMES = [
	'ci-pipeline',
	'terraform-runner',
	'grafana-bridge',
	'pagerduty-sync',
	'cost-exporter',
	'nightly-backfill',
	'load-generator',
	'slo-reporter',
	'log-shipper',
	'trace-sampler',
	'metrics-relay',
	'audit-archiver',
	'otel-collector',
	'k8s-operator',
	'billing-sync',
	'uptime-prober',
	'chaos-runner',
	'deploy-notifier',
	'schema-migrator',
	'alert-forwarder',
	'synthetic-canary',
	'usage-reporter',
	'snapshot-pruner',
	'ingest-throttler',
	'replay-worker',
	'quota-watcher',
	'span-rewriter',
	'digest-mailer',
];

const DAY = 24 * 60 * 60 * 1000;

/** Fixed epoch so the created column does not move between renders. */
const CREATED_AT = Date.UTC(2026, 1, 20, 13, 45);

const account = (
	index: number,
	status: ServiceAccountStatus,
): ServiceaccounttypesServiceAccountDTO => {
	const name = ACCOUNT_NAMES[index % ACCOUNT_NAMES.length];

	return {
		id: `service-account-${index}`,
		name,
		email: `${name}@service.nightswatch.io`,
		orgId: 'story-org',
		status,
		createdAt: new Date(CREATED_AT - index * DAY).toISOString(),
		updatedAt: new Date(CREATED_AT - index * DAY + 3600_000).toISOString(),
	};
};

export const serviceAccountsResponse = (
	active: number,
	deleted: number,
): ListServiceAccounts200 => ({
	status: 'success',
	data: [
		...Array.from({ length: active }, (_, index) =>
			account(index, ServiceAccountStatus.Active),
		),
		...Array.from({ length: deleted }, (_, index) =>
			account(index + active, ServiceAccountStatus.Deleted),
		),
	],
});

const serviceAccountRole = (
	id: string,
): ServiceaccounttypesServiceAccountRoleDTO => ({
	id: `service-account-role-${id}`,
	serviceAccountId: id,
	roleId: 'role-editor',
	role: {
		id: 'role-editor',
		name: 'editor',
		description: 'Can create and change dashboards, alerts and views.',
		orgId: 'story-org',
		type: RoleType.MANAGED,
		transactionGroups: [],
	},
	createdAt: new Date(CREATED_AT).toISOString(),
	updatedAt: new Date(CREATED_AT).toISOString(),
});

export const serviceAccountDetailResponse = (
	id: string,
	deleted: boolean,
): GetServiceAccount200 => {
	const index = Number.parseInt(id.split('-').pop() ?? '0', 10);
	const base = account(
		index,
		deleted ? ServiceAccountStatus.Deleted : ServiceAccountStatus.Active,
	);

	return {
		status: 'success',
		data: { ...base, id, serviceAccountRoles: [serviceAccountRole(id)] },
	};
};

const KEY_NAMES = [
	'production-writer',
	'staging-writer',
	'read-only-dashboards',
	'incident-bot',
	'legacy-collector',
	'canary-agent',
	'batch-loader',
	'edge-forwarder',
	'eu-region-writer',
	'ap-region-writer',
	'terraform-plan',
	'ci-smoke-tests',
	'grafana-datasource',
	'pagerduty-webhook',
	'cost-report',
	'archive-exporter',
	'preview-env',
	'on-prem-relay',
	'sandbox-writer',
	'audit-reader',
];

/** What Go marshals a zero time as, which the tab reads as "never used". */
const NEVER_OBSERVED = '0001-01-01T00:00:00Z';

/**
 * `expiresAt` is a unix second count, and zero is what "never expires" is sent
 * as. The rest are dated off now, because the column reads them against today
 * rather than against the account: a fixed date would read as expired forever.
 * The first three keys are the three ways the expiry column renders, and the
 * third is also the one that has never been called.
 */
const keyExpiry = (index: number): number => {
	if (index === 0) {
		return 0;
	}

	if (index === 1) {
		return Math.floor((Date.now() - 14 * DAY) / 1000);
	}

	return Math.floor((Date.now() + index * 30 * DAY) / 1000);
};

export const serviceAccountKeysResponse = (
	id: string,
	keys: number,
): ListServiceAccountKeys200 => ({
	status: 'success',
	data: Array.from({ length: keys }, (_, index) => ({
		id: `factor-api-key-${index}`,
		serviceAccountId: id,
		name: KEY_NAMES[index % KEY_NAMES.length],
		expiresAt: keyExpiry(index),
		lastObservedAt:
			index === 2
				? NEVER_OBSERVED
				: new Date(CREATED_AT - index * DAY).toISOString(),
		createdAt: new Date(CREATED_AT - index * 7 * DAY).toISOString(),
		updatedAt: new Date(CREATED_AT - index * DAY).toISOString(),
	})),
});

export const createdServiceAccountResponse = (): CreateServiceAccount201 => ({
	status: 'success',
	data: { id: 'service-account-0' },
});

/** The one and only time the secret comes back, which is what the modal says. */
export const createdServiceAccountKeyResponse =
	(): CreateServiceAccountKey201 => ({
		status: 'success',
		data: {
			id: 'factor-api-key-new',
			key: 'sk-story-8f14e45fceea167a5a36dedd4bea2543',
		},
	});

export const SAVE_OUTCOMES = ['succeeds', 'fails'] as const;

export type SaveOutcome = (typeof SAVE_OUTCOMES)[number];

export const serviceAccountSaveError = (): RenderErrorResponseDTO => ({
	status: 'error',
	error: {
		code: 'internal_error',
		type: 'internal',
		message: 'Could not rename the service account.',
		url: '',
		errors: [],
		suggestions: [],
	},
});
