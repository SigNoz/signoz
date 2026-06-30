/* AUTO GENERATED FILE - DO NOT EDIT - GENERATED FROM frontend/src/schemas/generated/webSettings.schema.json */

export interface WebSettings {
	appcues: Appcues;
	posthog: Posthog;
	pylon: Pylon;
	sentry: Sentry;
}
export interface Appcues {
	enabled: boolean;
}
export interface Posthog {
	enabled: boolean;
}
export interface Pylon {
	enabled: boolean;
}
export interface Sentry {
	dsn: string;
	enabled: boolean;
	tunnel: string;
}
