import Spinner from 'components/Spinner';
import { useTranslation } from 'react-i18next';

interface DataStateRendererProps<T> {
	isLoading: boolean;
	isRefetching: boolean;
	isError: boolean;
	data: T | null;
	errorMessage?: string;
	loadingMessage?: string;
	children: (data: T) => React.ReactNode;
}

function DataStateRenderer<T>({
	isLoading,
	isRefetching,
	isError,
	data,
	errorMessage,
	loadingMessage,
	children,
}: DataStateRendererProps<T>): JSX.Element {
	const { t } = useTranslation('common');

	if (isError || data === null) {
		return <div>{errorMessage ?? t('something_went_wrong')}</div>;
	}

	if (isLoading || isRefetching || !data) {
		return <Spinner tip={loadingMessage} height="100%" />;
	}

	return <>{children(data)}</>;
}

DataStateRenderer.defaultProps = {
	errorMessage: '',
	loadingMessage: 'Loading...',
};

export default DataStateRenderer;
