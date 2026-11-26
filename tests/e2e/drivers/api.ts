import type { APIResponse, Page } from '@playwright/test';

import { storageKey } from './base-path';

/**
 * The authenticated HTTP client every seed and API assertion goes through.
 *
 * Auth is a JWT in localStorage, not a cookie, so `page.request.*` does not
 * carry it on its own and every call needs the header attached by hand. One
 * place to do that, and one place that turns a non-2xx into a message naming the
 * method, the path and the body — a bare `res.json()` on a 400 reports as
 * "Unexpected end of JSON input", which names nothing.
 */

/** The `{ data, status }` envelope every v1/v2 JSON endpoint here returns. */
export interface Envelope<T> {
	data: T;
	status: string;
}

export interface Api {
	get<T>(path: string): Promise<T>;
	post<T>(path: string, data: unknown): Promise<T>;
	patch<T>(path: string, data: unknown): Promise<T>;
	put<T>(path: string, data: unknown): Promise<T>;
	del(path: string): Promise<void>;
	/** POST that returns `data.id` — the shape every create endpoint here uses. */
	create(path: string, data: unknown): Promise<string>;
	/** DELETE that tolerates a 404, for best-effort teardown. */
	tryDel(path: string): Promise<void>;
	token(): Promise<string>;
}

/**
 * Read the app JWT from the context's stored auth state. No navigation needed:
 * the storage state carries `AUTH_TOKEN` from the moment the context is created,
 * so this works regardless of where the page currently is.
 */
export async function authToken(page: Page): Promise<string> {
	const state = await page.context().storageState();
	for (const origin of state.origins) {
		const entry = origin.localStorage.find(
			(item) => item.name === storageKey('AUTH_TOKEN'),
		);
		if (entry) {
			return entry.value;
		}
	}
	throw new Error('AUTH_TOKEN not found in storage state — is the page authed?');
}

async function unwrap<T>(
	method: string,
	path: string,
	response: Promise<APIResponse>,
): Promise<T> {
	const res = await response;
	if (!res.ok()) {
		throw new Error(`${method} ${path} ${res.status()}: ${await res.text()}`);
	}
	const text = await res.text();
	return (text ? JSON.parse(text) : undefined) as T;
}

export function apiDriver(page: Page): Api {
	const headers = async (): Promise<Record<string, string>> => ({
		Authorization: `Bearer ${await authToken(page)}`,
	});

	const api: Api = {
		token: () => authToken(page),

		get: async <T>(path: string) =>
			unwrap<T>('GET', path, page.request.get(path, { headers: await headers() })),

		post: async <T>(path: string, data: unknown) =>
			unwrap<T>(
				'POST',
				path,
				page.request.post(path, { data, headers: await headers() }),
			),

		patch: async <T>(path: string, data: unknown) =>
			unwrap<T>(
				'PATCH',
				path,
				page.request.patch(path, { data, headers: await headers() }),
			),

		put: async <T>(path: string, data: unknown) =>
			unwrap<T>(
				'PUT',
				path,
				page.request.put(path, { data, headers: await headers() }),
			),

		del: async (path: string) => {
			await unwrap<unknown>(
				'DELETE',
				path,
				page.request.delete(path, { headers: await headers() }),
			);
		},

		tryDel: async (path: string) => {
			await page.request.delete(path, { headers: await headers() });
		},

		create: async (path: string, data: unknown) => {
			const body = await api.post<{ data: { id: string | number } }>(path, data);
			return String(body.data.id);
		},
	};

	return api;
}

/**
 * Base URL of the HTTP seeder container the pytest harness brings up. Written to
 * `.env.local` by `bootstrap/setup.py`.
 */
export function seederUrl(): string {
	const url = process.env.SIGNOZ_E2E_SEEDER_URL;
	if (!url) {
		throw new Error(
			'SIGNOZ_E2E_SEEDER_URL not set — pytest test_setup must be running.',
		);
	}
	return url;
}
