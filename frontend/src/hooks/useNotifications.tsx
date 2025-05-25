import { Button, notification } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import ErrorModal from 'components/ErrorModal/ErrorModal';
import { createContext, useContext, useMemo } from 'react';
import { ErrorV2 } from 'types/api';

type Notification = {
	notifications: NotificationInstance & {
		errorV2WithButton: (options: { error: ErrorV2 }) => void;
	};
};

const defaultNotification: Notification = {
	notifications: {
		...notification,
		errorV2WithButton: (): void => {},
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

	const notifications = useMemo(
		() => ({
			notifications: {
				...notificationApi,
				errorV2WithButton: ({ error }: { error: ErrorV2 }): void => {
					const key = `error${Date.now()}`;

					const errorButton = (
						<Button type="link" size="small">
							View Error
						</Button>
					);

					const errorModal = (
						<ErrorModal triggerComponent={errorButton} error={error} />
					);

					notificationApi.error({
						message: error.code,
						description: error.message,
						btn: errorModal,
						key,
					});
				},
			},
		}),
		[notificationApi],
	);

	return (
		<NotificationContext.Provider value={notifications}>
			{NotificationElement}
			{children}
		</NotificationContext.Provider>
	);
}

export const useNotifications = (): Notification =>
	useContext(NotificationContext);
