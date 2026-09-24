import {
	// eslint-disable-next-line no-restricted-imports
	createContext,
	ReactNode,
	useCallback,
	// eslint-disable-next-line no-restricted-imports
	useContext,
	useMemo,
	useState,
} from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import ErrorModal from 'components/ErrorModal/ErrorModal';
import APIError from 'types/api/error';

interface ErrorModalContextType {
	/**
	 * Accepts any thrown value. Generated-client calls reject with a raw
	 * `AxiosError`, so we normalize to `APIError` here — otherwise the modal would
	 * show a generic "status 400" instead of the backend's `error.message`.
	 */
	showErrorModal: (error: unknown) => void;
	hideErrorModal: () => void;
	isErrorModalVisible: boolean;
}

const ErrorModalContext = createContext<ErrorModalContextType | undefined>(
	undefined,
);

export function ErrorModalProvider({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	const [error, setError] = useState<APIError | null>(null);
	const [isVisible, setIsVisible] = useState(false);

	const showErrorModal = useCallback((rawError: unknown): void => {
		const apiError =
			rawError instanceof APIError
				? rawError
				: convertToApiError(rawError as Parameters<typeof convertToApiError>[0]);
		if (!apiError) {
			return;
		}
		setError(apiError);
		setIsVisible(true);
	}, []);

	const hideErrorModal = useCallback((): void => {
		setError(null);
		setIsVisible(false);
	}, []);

	const value = useMemo(
		() => ({ showErrorModal, hideErrorModal, isErrorModalVisible: isVisible }),
		[showErrorModal, hideErrorModal, isVisible],
	);

	return (
		<ErrorModalContext.Provider value={value}>
			{children}
			{isVisible && error && (
				<ErrorModal error={error} onClose={hideErrorModal} open={isVisible} />
			)}
		</ErrorModalContext.Provider>
	);
}

export const useErrorModal = (): ErrorModalContextType => {
	const context = useContext(ErrorModalContext);
	if (!context) {
		throw new Error('useErrorModal must be used within an ErrorModalProvider');
	}
	return context;
};
