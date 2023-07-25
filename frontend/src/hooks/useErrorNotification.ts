import { AxiosError } from 'axios';

import { useNotifications } from './useNotifications';

const useErrorNotification = (error: AxiosError | null): void => {
	const { notifications } = useNotifications();

	if (error) {
		notifications.error({
			message: error.message,
		});
	}
};

export default useErrorNotification;
