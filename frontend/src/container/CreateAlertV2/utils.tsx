// UI side feature flag
export const showNewCreateAlertsPage = (): boolean =>
	localStorage.getItem('showNewCreateAlertsPage') === 'true';

// UI side FF to switch between the 2 layouts of the create alert page
// Layout 1 - Default layout
// Layout 2 - Condensed layout
export const showCondensedLayout = (): boolean =>
	localStorage.getItem('showCondensedLayout') === 'true';
