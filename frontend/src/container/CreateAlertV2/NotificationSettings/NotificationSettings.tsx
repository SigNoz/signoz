import './styles.scss';

import Stepper from '../Stepper';
import MultipleNotifications from './MultipleNotifications';
import NotificationMessage from './NotificationMessage';
import ReNotification from './ReNotification';

function NotificationSettings(): JSX.Element {
	return (
		<div className="notification-settings-container">
			<Stepper stepNumber={4} label="Notification settings" />
			<NotificationMessage />
			<MultipleNotifications />
			<ReNotification />
		</div>
	);
}

export default NotificationSettings;
