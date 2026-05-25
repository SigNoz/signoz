import type { WebSettings } from 'types/generated/webSettings';

const raw = window.signozBootData?.settings as
	| Partial<WebSettings>
	| null
	| undefined;

export const bootSettings: Readonly<WebSettings> = {
	posthog: { enabled: raw?.posthog?.enabled ?? true },
	appcues: { enabled: raw?.appcues?.enabled ?? true },
};
