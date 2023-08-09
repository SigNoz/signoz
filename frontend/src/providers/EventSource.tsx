import { apiV3 } from 'api/apiV1';
import { ENVIRONMENT } from 'constants/env';
import { EventListener, EventSourcePolyfill } from 'event-source-polyfill';
import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

interface IEventSourceContext {
	eventSourceInstance: EventSourcePolyfill | null;
	isConnectionOpen: boolean;
	isConnectionLoading: boolean;
	isConnectionError: string;
	handleStartOpenConnection: (url?: string) => void;
	handleCloseConnection: () => void;
}

const EventSourceContext = createContext<IEventSourceContext>({
	eventSourceInstance: null,
	isConnectionOpen: false,
	isConnectionLoading: false,
	isConnectionError: '',
	handleStartOpenConnection: () => {},
	handleCloseConnection: () => {},
});

export function EventSourceProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const [isConnectionOpen, setIsConnectionOpen] = useState<boolean>(false);
	const [isConnectionLoading, setIsConnectionLoading] = useState<boolean>(false);
	const [isConnectionError, setIsConnectionError] = useState<string>('');

	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	const eventSourceRef = useRef<EventSourcePolyfill | null>(null);

	const handleCloseConnection = useCallback(() => {
		if (!eventSourceRef.current) return;

		eventSourceRef.current.close();
		setIsConnectionOpen(false);
		setIsConnectionLoading(false);
	}, []);

	const handleOpenConnection: EventListener = useCallback(() => {
		setIsConnectionLoading(false);
		setIsConnectionOpen(true);
	}, []);

	const handleErrorConnection: EventListener = useCallback(() => {
		if (!eventSourceRef.current) return;

		handleCloseConnection();

		eventSourceRef.current.removeEventListener('error', handleErrorConnection);
		eventSourceRef.current.removeEventListener('open', handleOpenConnection);
	}, [handleCloseConnection, handleOpenConnection]);

	const handleStartOpenConnection = useCallback(
		(url?: string) => {
			const eventSourceUrl = url || `${ENVIRONMENT.baseURL}${apiV3}logs/livetail`;

			const TIMEOUT_IN_MS = 10 * 60 * 1000;

			eventSourceRef.current = new EventSourcePolyfill(eventSourceUrl, {
				headers: {
					Authorization: `Bearer ${user?.accessJwt}`,
				},
				heartbeatTimeout: TIMEOUT_IN_MS,
			});

			setIsConnectionLoading(true);
			setIsConnectionError('');

			eventSourceRef.current.addEventListener('error', handleErrorConnection);

			eventSourceRef.current.addEventListener('open', handleOpenConnection);
		},
		[handleErrorConnection, handleOpenConnection, user?.accessJwt],
	);

	const contextValue = useMemo(
		() => ({
			eventSourceInstance: eventSourceRef.current,
			isConnectionError,
			isConnectionLoading,
			isConnectionOpen,
			handleStartOpenConnection,
			handleCloseConnection,
		}),
		[
			isConnectionError,
			isConnectionLoading,
			isConnectionOpen,
			handleStartOpenConnection,
			handleCloseConnection,
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
