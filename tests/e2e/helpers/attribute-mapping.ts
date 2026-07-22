import type { APIRequestContext, Page } from '@playwright/test';

export const ATTRIBUTE_MAPPING_PATH = '/ai-observability/attribute-mapping';
export const ATTRIBUTE_MAPPING_PAGE_TESTID =
	'llm-observability-attribute-mapping-page';

/** Navigate to the Attribute Mapping page and wait for its root container. */
export async function gotoAttributeMapping(page: Page): Promise<void> {
	await page.goto(ATTRIBUTE_MAPPING_PATH);
	await page
		.getByTestId(ATTRIBUTE_MAPPING_PAGE_TESTID)
		.waitFor({ state: 'visible' });
}

interface SpanMapperGroup {
	id: string;
	name: string;
}

/** List span-mapper groups via API (`GET /api/v1/span_mapper_groups`). */
export async function listSpanMapperGroups(
	request: APIRequestContext,
	token: string,
): Promise<SpanMapperGroup[]> {
	const res = await request.get('/api/v1/span_mapper_groups', {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		return [];
	}
	const body = (await res.json()) as { data?: { items?: SpanMapperGroup[] } };
	return body.data?.items ?? [];
}

export async function deleteSpanMapperGroupsByName(
	request: APIRequestContext,
	token: string,
	names: string[],
): Promise<void> {
	const wanted = new Set(names);
	const groups = await listSpanMapperGroups(request, token).catch(() => []);
	await Promise.all(
		groups
			.filter((group) => wanted.has(group.name))
			.map((group) =>
				request
					.delete(`/api/v1/span_mapper_groups/${group.id}`, {
						headers: { Authorization: `Bearer ${token}` },
					})
					.catch(() => undefined),
			),
	);
}
