import { useEffect } from 'react';
import { AxiosError } from 'axios';

import { useNotifications } from './useNotifications';

const useErrorNotification = (error: AxiosError | null): void => {
	const { notifications } = useNotifications();
	useEffect(() => {
		if (error) {
			notifications.error({
				message: error.message,
			});
		}
	}, [error, notifications]);
};

export default useErrorNotification;
