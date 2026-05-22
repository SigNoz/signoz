export interface SentryConfig {
	dsn?: string;
	tunnelUrl?: string;
}
export interface PosthogConfig {
	key?: string;
}
export interface PylonConfig {
	appId?: string;
	identSecret?: string;
}
export interface AppcuesConfig {
	appId?: string;
}
export interface RolesConfig {
	isRolesDetailEnabled?: boolean;
}

export interface SignozBootSettings {
	sentry: SentryConfig;
	posthog: PosthogConfig;
	pylon: PylonConfig;
	appcues: AppcuesConfig;
	roles: RolesConfig;
}

const raw = window.signozBootData?.settings;

export const bootSettings: Readonly<SignozBootSettings> = {
	sentry: raw?.sentry ?? {},
	posthog: raw?.posthog ?? {},
	pylon: raw?.pylon ?? {},
	appcues: raw?.appcues ?? {},
	roles: raw?.roles ?? {},
};
