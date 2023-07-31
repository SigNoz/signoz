import { notification } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import { createContext, useContext, useMemo } from 'react';

type Notification = {
	notifications: NotificationInstance;
};

const defaultNotification: Notification = {
	notifications: {
		success: (): void => {},
		error: (): void => {},
		info: (): void => {},
		warning: (): void => {},
		open: (): void => {},
		destroy: (): void => {},
	},
};

export const NotificationContext = createContext<Notification>(
	defaultNotification,
);

export function NotificationProvider({
	children,
}: {
	children: JSX.Element;
}): JSX.Element {
	const [notificationApi, NotificationElement] = notification.useNotification();
	const notifications = useMemo(() => ({ notifications: notificationApi }), [
		notificationApi,
	]);

	return (
		<NotificationContext.Provider value={notifications}>
			{NotificationElement}
			{children}
		</NotificationContext.Provider>
	);
}

export const useNotifications = (): Notification =>
	useContext(NotificationContext);
