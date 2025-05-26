import ErrorModal from 'components/ErrorModal/ErrorModal';
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';
import APIError from 'types/api/error';

interface ErrorModalContextType {
	showErrorModal: (error: APIError) => void;
	hideErrorModal: () => void;
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

	const showErrorModal = useCallback((error: APIError): void => {
		setError(error);
		setIsVisible(true);
	}, []);

	const hideErrorModal = useCallback((): void => {
		setError(null);
		setIsVisible(false);
	}, []);

	const value = useMemo(() => ({ showErrorModal, hideErrorModal }), [
		showErrorModal,
		hideErrorModal,
	]);

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
