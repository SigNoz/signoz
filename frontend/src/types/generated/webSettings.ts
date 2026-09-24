/* AUTO GENERATED FILE - DO NOT EDIT - GENERATED FROM frontend/src/schemas/generated/webSettings.schema.json */

export interface WebSettings {
	appcues: Appcues;
	posthog: Posthog;
	pylon: Pylon;
	sentry: Sentry;
}
export interface Appcues {
	appId?: string;
	enabled: boolean;
}
export interface Posthog {
	apiHost?: string;
	enabled: boolean;
	key?: string;
	uiHost?: string;
}
export interface Pylon {
	appId?: string;
	enabled: boolean;
	identitySecret?: string;
}
export interface Sentry {
	dsn?: string;
	enabled: boolean;
	tunnel?: string;
}
