const API = 'https://api.github.com';
const MAX_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GitHub sends `retry-after` (seconds) for a secondary limit, and `x-ratelimit-reset`
// (epoch seconds) once the hourly budget is spent.
export function rateLimitWait(response, now = Date.now()) {
	if (response.status !== 403 && response.status !== 429) {
		return null;
	}
	const retryAfter = Number(response.headers.get('retry-after'));
	if (retryAfter) {
		return retryAfter * 1000;
	}
	if (response.headers.get('x-ratelimit-remaining') !== '0') {
		return null;
	}
	const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
	return Math.max(reset - now, 0) + 1000;
}

export async function gh(path, init = {}, attempt = 1) {
	const retry = !init.method && attempt < MAX_ATTEMPTS;
	let response;
	try {
		response = await fetch(path.startsWith('http') ? path : API + path, {
			...init,
			headers: {
				accept: 'application/vnd.github+json',
				authorization: `Bearer ${process.env.GH_TOKEN}`,
				...init.headers,
			},
		});
	} catch (error) {
		if (!retry) {
			throw error;
		}
		await sleep(attempt * RETRY_BACKOFF_MS);
		return gh(path, init, attempt + 1);
	}
	const wait = rateLimitWait(response);
	if (wait !== null) {
		process.stderr.write(`rate limited, waiting ${Math.ceil(wait / 1000)} s\n`);
		await sleep(wait);
		return gh(path, init, attempt);
	}
	if (retry && response.status >= 500) {
		await sleep(attempt * RETRY_BACKOFF_MS);
		return gh(path, init, attempt + 1);
	}
	if (!response.ok) {
		throw new Error(`${response.status} ${init.method ?? 'GET'} ${path}`);
	}
	return response;
}

export async function mapLimit(items, limit, fn) {
	const results = [];
	let next = 0;
	await Promise.all(
		Array.from({ length: limit }, async () => {
			while (next < items.length) {
				const index = next;
				next += 1;
				results[index] = await fn(items[index]);
			}
		}),
	);
	return results;
}

export async function paginate(path, key) {
	const items = [];
	let next = API + path;
	while (next) {
		const response = await gh(next);
		const body = await response.json();
		items.push(...(key ? body[key] : body));
		next = response.headers.get('link')?.match(/<([^>]+)>; rel="next"/)?.[1];
	}
	return items;
}
