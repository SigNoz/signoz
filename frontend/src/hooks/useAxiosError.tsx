import axios from 'axios';

import { useNotifications } from './useNotifications';

const useAxiosError = (): UseAxiosError => {
	const { notifications } = useNotifications();

	return (error: unknown): void => {
		if (axios.isAxiosError(error)) {
			notifications.error({
				message: error.message,
			});
		}
	};
};

type UseAxiosError = (error: unknown) => void;

export default useAxiosError;
