import { Tabs } from 'antd/lib';
import TextArea from 'antd/lib/input/TextArea';

import { useCreateAlertState } from '../context';

function NotificationMessage(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	const NotificationMessageEditor = (
		<TextArea
			value={notificationSettings.description}
			onChange={(e): void =>
				setNotificationSettings({
					type: 'SET_DESCRIPTION',
					payload: e.target.value,
				})
			}
			placeholder="Enter notification message..."
		/>
	);

	const items = [
		{
			key: '1',
			label: 'Notification Message',
			children: NotificationMessageEditor,
		},
	];

	return (
		<div className="notification-message-container">
			<Tabs items={items} />
		</div>
	);
}

export default NotificationMessage;
