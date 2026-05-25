export interface SignozBootSettings {
	posthog: { enabled?: boolean };
	appcues: { enabled?: boolean };
}

const raw = window.signozBootData?.settings;

export const bootSettings: Readonly<SignozBootSettings> = {
	posthog: raw?.posthog ?? {},
	appcues: raw?.appcues ?? {},
};
