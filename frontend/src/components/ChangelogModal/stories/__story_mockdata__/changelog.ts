import {
	ChangelogSchema,
	DeploymentType,
} from 'types/api/changelog/getChangelogByVersion';

const TIMESTAMP = '2026-11-03T12:00:00Z';

function feature(
	id: number,
	title: string,
	description: string,
): ChangelogSchema['features'][number] {
	return {
		id,
		documentId: `feature-${id}`,
		title,
		description,
		media: null,
		sort_order: id,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
		publishedAt: TIMESTAMP,
		deployment_type: DeploymentType.ALL,
	};
}

/** Long enough to scroll, so the "Scroll for more" button shows. */
export const storyChangelog: ChangelogSchema = {
	id: 1,
	documentId: 'changelog-v0.99.0',
	version: 'v0.99.0',
	release_date: '2026-11-03',
	createdAt: TIMESTAMP,
	updatedAt: TIMESTAMP,
	publishedAt: TIMESTAMP,
	features: [
		feature(
			1,
			'Dashboard sections',
			'Group panels into **sections** you can collapse, rename and drag. Existing dashboards move into a single section the first time you edit them.',
		),
		feature(
			2,
			'Service accounts',
			'Create service accounts with their own API keys and roles. Keys can expire, and you can revoke them without touching the account. See the [docs](https://signoz.io/docs/) for the API.',
		),
		feature(
			3,
			'Faster log search',
			'Full-text search over log bodies now uses a token index:\n\n- queries over a day of logs return up to 4x faster\n- `has()` and `hasToken()` use the same index\n- the old behaviour stays behind a setting for a release',
		),
		feature(
			4,
			'Routing policies',
			'Send an alert to a channel based on its labels instead of picking the channel in every rule. Policies are evaluated in order and the first match wins.',
		),
	],
	bug_fixes:
		'- Fixed the time picker losing the selected range after a refresh.\n- Fixed trace waterfall rows overlapping when a span name wraps.\n- Fixed CSV export dropping columns with dots in their names.',
	maintenance:
		'- Upgraded the OpenTelemetry collector to the latest release.\n- Reduced the memory used by the query service on large dashboards.',
};
