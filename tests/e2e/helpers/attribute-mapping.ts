import type { APIRequestContext, Page } from '@playwright/test';

// Helpers for the LLM Observability "Attribute Mapping" page
// (`/ai-observability/attribute-mapping`). The page edits an in-memory draft
// tree of groups + mappers and only persists to the backend when the header
// "Save changes" button is clicked (see saveDraft.ts `persistDraft`).

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

/**
 * Best-effort delete of every group whose name is in `names`. Deleting a group
 * cascades its mappers server-side. Errors are swallowed so suite cleanup stays
 * resilient when a UI flow already removed the group or the stack is mid-shutdown.
 */
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
