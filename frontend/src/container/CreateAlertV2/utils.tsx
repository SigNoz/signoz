import { Spin } from 'antd';
import { createPortal } from 'react-dom';

import { useCreateAlertState } from './context';

// UI side feature flag
export const showNewCreateAlertsPage = (): boolean =>
	localStorage.getItem('showNewCreateAlertsPage') === 'true';

// UI side FF to switch between the 2 layouts of the create alert page
// Layout 1 - Default layout
// Layout 2 - Condensed layout
export const showCondensedLayout = (): boolean =>
	localStorage.getItem('showCondensedLayout') === 'true';

export function Spinner(): JSX.Element | null {
	const { isCreatingAlertRule } = useCreateAlertState();

	if (!isCreatingAlertRule) return null;

	return createPortal(
		<div className="sticky-page-spinner">
			<Spin size="large" spinning />
		</div>,
		document.body,
	);
}
