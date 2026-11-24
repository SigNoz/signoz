import type { PostHog } from 'posthog-js';

let loading: Promise<PostHog | undefined> | undefined;
let loaded: PostHog | undefined;

export function loadPostHog(): Promise<PostHog | undefined> | undefined {
	const settings = window.signozBootData?.settings?.posthog;
	if (!settings?.enabled || !settings.key) {
		return undefined;
	}

	const { key, apiHost, uiHost } = settings;
	loading ??= import('posthog-js')
		.then(({ default: posthog }) => {
			posthog.init(key, {
				api_host: apiHost,
				ui_host: uiHost,
				person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
			});
			loaded = posthog;
			return posthog;
		})
		.catch(() => undefined);
	return loading;
}

export async function withPostHog(
	callback: (posthog: PostHog) => void,
): Promise<void> {
	const posthog = await loadPostHog();
	if (posthog) {
		callback(posthog);
	}
}

export function getLoadedPostHog(): PostHog | undefined {
	return loaded;
}

export async function resetPostHog(): Promise<void> {
	const posthog = await loading;
	posthog?.reset();
}
