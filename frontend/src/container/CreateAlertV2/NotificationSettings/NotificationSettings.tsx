import './styles.scss';

import Stepper from '../Stepper';
import { showCondensedLayout } from '../utils';
import MultipleNotifications from './MultipleNotifications';
import NotificationMessage from './NotificationMessage';
import NotificationFrequency from './NotificationFrequency';

function NotificationSettings(): JSX.Element {
	const showCondensedLayoutFlag = showCondensedLayout();

	return (
		<div className="notification-settings-container">
			<Stepper
				stepNumber={showCondensedLayoutFlag ? 3 : 4}
				label="Notification settings"
			/>
			<NotificationMessage />
			<MultipleNotifications />
			<NotificationFrequency />
		</div>
	);
}

export default NotificationSettings;
