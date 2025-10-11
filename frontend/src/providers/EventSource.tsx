import { apiV3 } from 'api/apiV1';
import getLocalStorageApi from 'api/browser/localstorage/get';
import { Logout } from 'api/utils';
import post from 'api/v2/sessions/rotate/post';
import afterLogin from 'AppRoutes/utils';
import { ENVIRONMENT } from 'constants/env';
import { LIVE_TAIL_HEARTBEAT_TIMEOUT } from 'constants/liveTail';
import { LOCALSTORAGE } from 'constants/localStorage';
import { EventListener, EventSourcePolyfill } from 'event-source-polyfill';
import { useNotifications } from 'hooks/useNotifications';
import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useQueryClient } from 'react-query';
import APIError from 'types/api/error';

interface IEventSourceContext {
	eventSourceInstance: EventSourcePolyfill | null;
	isConnectionOpen: boolean;
	isConnectionLoading: boolean;
	isConnectionError: boolean;
	initialLoading: boolean;
	reconnectDueToError: boolean;
	handleStartOpenConnection: (filterExpression?: string) => void;
	handleCloseConnection: () => void;
	handleSetInitialLoading: (value: boolean) => void;
}

const EventSourceContext = createContext<IEventSourceContext>({
	eventSourceInstance: null,
	isConnectionOpen: false,
	isConnectionLoading: false,
	initialLoading: true,
	isConnectionError: false,
	reconnectDueToError: false,
	handleStartOpenConnection: () => {},
	handleCloseConnection: () => {},
	handleSetInitialLoading: () => {},
});

export function EventSourceProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const [isConnectionOpen, setIsConnectionOpen] = useState<boolean>(false);
	const [isConnectionLoading, setIsConnectionLoading] = useState<boolean>(false);
	const [isConnectionError, setIsConnectionError] = useState<boolean>(false);

	const [reconnectDueToError, setReconnectDueToError] = useState<boolean>(false);

	const [initialLoading, setInitialLoading] = useState<boolean>(true);

	const eventSourceRef = useRef<EventSourcePolyfill | null>(null);

	const { notifications } = useNotifications();
	const queryClient = useQueryClient();

	const handleSetInitialLoading = useCallback((value: boolean) => {
		setInitialLoading(value);
	}, []);

	const handleOpenConnection: EventListener = useCallback(() => {
		setIsConnectionLoading(false);
		setIsConnectionOpen(true);
		setInitialLoading(false);
	}, []);

	const handleErrorConnection: EventListener = useCallback(async () => {
		setIsConnectionOpen(false);
		setIsConnectionLoading(true);
		setInitialLoading(false);

		try {
			const accessToken = getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN);
			const refreshToken = getLocalStorageApi(LOCALSTORAGE.REFRESH_AUTH_TOKEN);

			const response = await queryClient.fetchQuery({
				queryFn: () => post({ refreshToken: refreshToken || '' }),
				queryKey: ['/api/v2/sessions/rotate', accessToken, refreshToken],
			});
			afterLogin(response.data.accessToken, response.data.refreshToken, true);

			// If token refresh was successful, we'll let the component
			// handle reconnection through the reconnectDueToError state
			setReconnectDueToError(true);
			setIsConnectionError(true);
			return;
		} catch (error) {
			// If there was an error during token refresh, we'll just
			// let the component handle the error state
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
			});
			setIsConnectionError(true);
			if (!eventSourceRef.current) return;
			eventSourceRef.current.close();
			Logout();
		}
	}, [notifications, queryClient]);

	const destroyEventSourceSession = useCallback(() => {
		if (!eventSourceRef.current) return;

		eventSourceRef.current.close();
		eventSourceRef.current.removeEventListener('error', handleErrorConnection);
		eventSourceRef.current.removeEventListener('open', handleOpenConnection);
	}, [handleErrorConnection, handleOpenConnection]);

	const handleCloseConnection = useCallback(() => {
		setIsConnectionOpen(false);
		setIsConnectionLoading(false);
		setIsConnectionError(false);

		destroyEventSourceSession();
	}, [destroyEventSourceSession]);

	const handleStartOpenConnection = useCallback(
		(filterExpression?: string): void => {
			const eventSourceUrl = `${
				ENVIRONMENT.baseURL
			}${apiV3}logs/livetail?filter=${encodeURIComponent(filterExpression || '')}`;

			eventSourceRef.current = new EventSourcePolyfill(eventSourceUrl, {
				headers: {
					Authorization: `Bearer ${getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN)}`,
				},
				heartbeatTimeout: LIVE_TAIL_HEARTBEAT_TIMEOUT,
			});

			setIsConnectionLoading(true);
			setIsConnectionError(false);
			setReconnectDueToError(false);

			eventSourceRef.current.addEventListener('error', handleErrorConnection);
			eventSourceRef.current.addEventListener('open', handleOpenConnection);
		},
		[handleErrorConnection, handleOpenConnection],
	);

	useEffect(
		() => (): void => {
			handleCloseConnection();
		},
		[handleCloseConnection],
	);

	const contextValue: IEventSourceContext = useMemo(
		() => ({
			eventSourceInstance: eventSourceRef.current,
			isConnectionError,
			isConnectionLoading,
			isConnectionOpen,
			initialLoading,
			reconnectDueToError,
			handleStartOpenConnection,
			handleCloseConnection,
			handleSetInitialLoading,
		}),
		[
			isConnectionError,
			isConnectionLoading,
			isConnectionOpen,
			initialLoading,
			reconnectDueToError,
			handleStartOpenConnection,
			handleCloseConnection,
			handleSetInitialLoading,
		],
	);

	return (
		<EventSourceContext.Provider value={contextValue}>
			{children}
		</EventSourceContext.Provider>
	);
}

export const useEventSource = (): IEventSourceContext => {
	const context = useContext(EventSourceContext);

	if (!context) {
		throw new Error('Should be used inside the context');
	}

	return context;
};
