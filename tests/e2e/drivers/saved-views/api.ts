/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import type { Page } from '@playwright/test';

import { authToken } from '../../helpers/common';
import { SAVED_VIEWS_API } from './spec';
import type { GettableSavedView, PostableSavedView } from './spec.types';

async function bearer(page: Page): Promise<{ Authorization: string }> {
	return { Authorization: `Bearer ${await authToken(page)}` };
}

export async function createViaApi(
	page: Page,
	view: PostableSavedView,
): Promise<string> {
	const res = await page.request.post(SAVED_VIEWS_API, {
		data: view,
		headers: await bearer(page),
	});
	if (!res.ok()) {
		throw new Error(
			`POST ${SAVED_VIEWS_API} ${res.status()}: ${await res.text()}`,
		);
	}
	return ((await res.json()) as { data: { id: string } }).data.id;
}

export async function getViaApi(
	page: Page,
	id: string,
): Promise<GettableSavedView> {
	const res = await page.request.get(`${SAVED_VIEWS_API}/${id}`, {
		headers: await bearer(page),
	});
	if (!res.ok()) {
		throw new Error(
			`GET ${SAVED_VIEWS_API}/${id} ${res.status()}: ${await res.text()}`,
		);
	}
	return ((await res.json()) as { data: GettableSavedView }).data;
}

/** The status alone, for asserting a view is gone. */
export async function statusViaApi(page: Page, id: string): Promise<number> {
	const res = await page.request.get(`${SAVED_VIEWS_API}/${id}`, {
		headers: await bearer(page),
	});
	return res.status();
}

/** Not asserted: a test that deleted its own view must not fail on cleanup. */
export async function deleteViaApi(page: Page, id: string): Promise<void> {
	try {
		await page.request.delete(`${SAVED_VIEWS_API}/${id}`, {
			headers: await bearer(page),
		});
	} catch {
		/* the view outlives the run rather than hiding why it failed */
	}
}

const trackedByPage = new WeakMap<Page, string[]>();

/** Registers a view for deletion when the test owning `page` ends. */
export function trackSavedView(page: Page, id: string): void {
	trackedByPage.set(page, [...(trackedByPage.get(page) ?? []), id]);
}

export async function removeTrackedSavedViews(page: Page): Promise<void> {
	const ids = trackedByPage.get(page) ?? [];
	trackedByPage.delete(page);
	for (const id of ids) {
		await deleteViaApi(page, id);
	}
}
