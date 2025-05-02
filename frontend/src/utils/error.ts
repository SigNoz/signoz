import { NotificationInstance } from 'antd/es/notification/interface';
import axios from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';

export const showErrorNotification = (
	notifications: NotificationInstance,
	err: Error,
): void => {
	notifications.error({
		message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
	});
};
