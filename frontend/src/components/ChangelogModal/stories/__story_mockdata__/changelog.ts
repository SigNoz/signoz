/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	ChangelogSchema,
	DeploymentType,
} from 'types/api/changelog/getChangelogByVersion';

const PUBLISHED_AT = '2026-08-12T09:00:00.000Z';

const feature = (
	id: number,
	title: string,
	description: string,
): ChangelogSchema['features'][number] => ({
	id,
	documentId: `feature-${id}`,
	title,
	sort_order: id,
	createdAt: PUBLISHED_AT,
	updatedAt: PUBLISHED_AT,
	publishedAt: PUBLISHED_AT,
	description,
	deployment_type: DeploymentType.ALL,
	// Media stays null so no story reaches out to the CMS for an image.
	media: null,
});

export const changelog: ChangelogSchema = {
	id: 1,
	documentId: 'changelog-v0-99-0',
	version: 'v0.99.0',
	release_date: '2026-08-12',
	createdAt: PUBLISHED_AT,
	updatedAt: PUBLISHED_AT,
	publishedAt: PUBLISHED_AT,
	features: [
		feature(
			1,
			'Metrics explorer',
			'Browse every metric you send, inspect its labels and turn it into a panel without writing a query.\n\n- Search metrics by name, type or unit\n- See cardinality per label before you group by it\n- Open any metric straight in the query builder\n\nRead more in the [metrics explorer docs](https://signoz.io/docs/metrics-management/metrics-explorer/).',
		),
		feature(
			2,
			'Trace funnels',
			'Measure conversion and drop-off across a multi-service request path. Define each step as a span filter, then compare the latency and error rate between any two steps.',
		),
		feature(
			3,
			'Saved views for logs',
			'Save a logs query with its columns and time range, share it with your team and pin the ones you open most.',
		),
		feature(
			4,
			'Alert history',
			'Every alert now keeps a timeline of its state changes, with the value that crossed the threshold and the labels it fired for.',
		),
	],
	bug_fixes:
		'- Fixed dashboard variables losing their selection on refresh.\n- Fixed alert history pagination skipping a page.\n- Fixed the logs list jumping to the top after a live tail update.',
	maintenance:
		'- Upgraded the query service to Go 1.24.\n- Reduced the ClickHouse memory used by trace aggregation queries.',
};
