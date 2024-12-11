import { apiV3 } from 'api/apiV1';
import { ENVIRONMENT } from 'constants/env';
import { LIVE_TAIL_HEARTBEAT_TIMEOUT } from 'constants/liveTail';
import { EventListener, EventSourcePolyfill } from 'event-source-polyfill';
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

import { useAppContext } from './App/App';

interface IEventSourceContext {
	eventSourceInstance: EventSourcePolyfill | null;
	isConnectionOpen: boolean;
	isConnectionLoading: boolean;
	isConnectionError: boolean;
	initialLoading: boolean;
	handleStartOpenConnection: (urlProps: {
		url?: string;
		queryString: string;
	}) => void;
	handleCloseConnection: () => void;
	handleSetInitialLoading: (value: boolean) => void;
}

const EventSourceContext = createContext<IEventSourceContext>({
	eventSourceInstance: null,
	isConnectionOpen: false,
	isConnectionLoading: false,
	initialLoading: true,
	isConnectionError: false,
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

	const [initialLoading, setInitialLoading] = useState<boolean>(true);

	const { user } = useAppContext();

	const eventSourceRef = useRef<EventSourcePolyfill | null>(null);

	const handleSetInitialLoading = useCallback((value: boolean) => {
		setInitialLoading(value);
	}, []);

	const handleOpenConnection: EventListener = useCallback(() => {
		setIsConnectionLoading(false);
		setIsConnectionOpen(true);
		setInitialLoading(false);
	}, []);

	const handleErrorConnection: EventListener = useCallback(() => {
		setIsConnectionOpen(false);
		setIsConnectionLoading(false);
		setIsConnectionError(true);
		setInitialLoading(false);

		if (!eventSourceRef.current) return;

		eventSourceRef.current.close();
	}, []);

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
		(urlProps: { url?: string; queryString: string }): void => {
			const { url, queryString } = urlProps;

			const eventSourceUrl = url
				? `${url}/?${queryString}`
				: `${ENVIRONMENT.baseURL}${apiV3}logs/livetail?${queryString}`;

			eventSourceRef.current = new EventSourcePolyfill(eventSourceUrl, {
				headers: {
					Authorization: `Bearer ${user?.accessJwt}`,
				},
				heartbeatTimeout: LIVE_TAIL_HEARTBEAT_TIMEOUT,
			});

			setIsConnectionLoading(true);
			setIsConnectionError(false);

			eventSourceRef.current.addEventListener('error', handleErrorConnection);
			eventSourceRef.current.addEventListener('open', handleOpenConnection);
		},
		[user, handleErrorConnection, handleOpenConnection],
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
			handleStartOpenConnection,
			handleCloseConnection,
			handleSetInitialLoading,
		}),
		[
			isConnectionError,
			isConnectionLoading,
			isConnectionOpen,
			initialLoading,
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
