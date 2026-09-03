/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { GetLicense200 } from 'api/generated/services/sigNoz.schemas';
import { USER_PREFERENCES } from 'constants/userPreferences';
import type { UserPreference } from 'types/api/preferences/preference';

/**
 * Wire-shaped payloads for the endpoints the app shell calls on every route.
 * Shapes follow the fields the components read, not the full generated DTOs.
 */

export const baseUserPreferences: UserPreference[] = [
	{
		name: USER_PREFERENCES.SIDENAV_PINNED,
		description: 'Keep the side navigation pinned open',
		valueType: 'boolean',
		defaultValue: false,
		allowedValues: ['true', 'false'],
		allowedScopes: ['user'],
		value: true,
	},
];

export const userPreferencesResponse = (
	preferences: UserPreference[] = baseUserPreferences,
): Record<string, unknown> => ({
	status: 'success',
	data: preferences,
});

export const zeusHostsResponse = {
	status: 'success',
	data: {
		hosts: [{ url: 'https://ingest.us.signoz.cloud:443', is_default: true }],
	},
};

export const versionResponse = {
	version: 'v0.0.0',
	ee: 'Y',
	setupCompleted: true,
};

export const latestGithubReleaseResponse = {
	tag_name: 'v0.0.0',
	name: 'v0.0.0',
	html_url: 'https://github.com/SigNoz/signoz/releases/tag/v0.0.0',
};

/**
 * The license `useActiveLicenseKey` reads the key off, keyed by the id the
 * app-shell context carries. Only the key reaches the UI; the rest of the DTO
 * mirrors the context fixture so the two agree on which license this is.
 */
export const licenseWithKeyResponse = {
	status: 'success',
	data: {
		id: 'test-license-id',
		key: '96a1c6a4-3f1e-4b7d-9f2a-8c0d5e6f7a8b',
		state: 'ACTIVATED',
		status: 'VALID',
		platform: 'CLOUD',
		eventQueue: {
			createdAt: '0',
			event: '',
			scheduledAt: '0',
			status: '',
			updatedAt: '0',
		},
		plan: {
			id: '0',
			createdAt: '0',
			description: '',
			isActive: true,
			name: '',
			updatedAt: '0',
		},
		features: [],
		createdAt: '0',
		updatedAt: '0',
		freeUntil: '0',
		validFrom: 0,
		validUntil: 0,
	},
} satisfies GetLicense200;

export const globalConfigResponse = {
	status: 'success',
	data: {
		ai_assistant_url: null,
		external_url: 'https://storybook.signoz.local',
		ingestion_url: 'https://ingest.us.signoz.cloud:443',
		mcp_url: null,
	},
};

/**
 * `ChangelogSchema` for the current version. Kept non-empty because
 * `getChangelogByVersion` treats an empty list as a failure, and media is left
 * null so no story reaches out for an image.
 */
export const changelogResponse = {
	data: [
		{
			id: 1,
			documentId: 'changelog-v0-99-0',
			version: 'v0.0.0',
			release_date: '2026-08-12',
			bug_fixes:
				'Fixed dashboard variables losing their selection on refresh.\nFixed alert history pagination.',
			maintenance: 'Upgraded the query service to Go 1.24.',
			createdAt: '2026-08-12T09:00:00.000Z',
			updatedAt: '2026-08-12T09:00:00.000Z',
			publishedAt: '2026-08-12T09:00:00.000Z',
			features: [
				{
					id: 11,
					documentId: 'feature-metrics-explorer',
					title: 'Metrics explorer',
					sort_order: 1,
					createdAt: '2026-08-12T09:00:00.000Z',
					updatedAt: '2026-08-12T09:00:00.000Z',
					publishedAt: '2026-08-12T09:00:00.000Z',
					description:
						'Browse every metric you send, inspect its labels and turn it into a panel without writing a query.',
					deployment_type: 'All',
					media: null,
				},
				{
					id: 12,
					documentId: 'feature-trace-funnels',
					title: 'Trace funnels',
					sort_order: 2,
					createdAt: '2026-08-12T09:00:00.000Z',
					updatedAt: '2026-08-12T09:00:00.000Z',
					publishedAt: '2026-08-12T09:00:00.000Z',
					description:
						'Measure conversion and drop-off across a multi-service request path.',
					deployment_type: 'All',
					media: null,
				},
			],
		},
	],
};
