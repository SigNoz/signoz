// UI side feature flag
export const showNewCreateAlertsPage = (): boolean =>
	localStorage.getItem('showNewCreateAlertsPage') === 'true';

export const enableRecoveryThreshold = (): boolean =>
	localStorage.getItem('enableRecoveryThreshold') === 'true';
