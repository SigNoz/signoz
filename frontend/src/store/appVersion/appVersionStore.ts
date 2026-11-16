import { create } from 'zustand';

export const SERVER_VERSION_HEADER = 'x-signoz-version';

interface AppVersionState {
	isNewVersionAvailable: boolean;
}

export const useAppVersionStore = create<AppVersionState>()(() => ({
	isNewVersionAvailable: false,
}));

export const reportServerVersion = (serverVersion: string): void => {
	const bundleVersion = process.env.VERSION;
	if (bundleVersion && serverVersion && serverVersion !== bundleVersion) {
		useAppVersionStore.setState({ isNewVersionAvailable: true });
	}
};
