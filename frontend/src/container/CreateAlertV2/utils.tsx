// UI side feature flag
export const showNewCreateAlertsPage = (): boolean =>
	localStorage.getItem('showNewCreateAlertsPage') === 'true';
