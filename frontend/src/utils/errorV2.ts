import { NotificationInstance } from 'antd/es/notification/interface';
import APIError from 'types/api/error';

export const showErrorNotificationV2 = (
	notifications: NotificationInstance,
	err: APIError,
): void => {
	notifications.error({
		message: err.getErrorCode(),
		description: err.getErrorMessage(),
	});
};
