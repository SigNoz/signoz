import { Spinner } from '@signozhq/ui/spinner';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';

import ThresholdField from './ThresholdField';

interface ApdexSettingsFormProps {
	serviceName: string;
	onDone: () => void;
}

/** Mounted on open, so the field starts from the saved threshold each time. */
function ApdexSettingsForm({
	serviceName,
	onDone,
}: ApdexSettingsFormProps): JSX.Element {
	const { data, isLoading, refetch } = useGetApDexSettings(serviceName);

	if (isLoading) {
		return <Spinner size={16} aria-label="Loading Apdex threshold" />;
	}

	return (
		<ThresholdField
			serviceName={serviceName}
			savedThreshold={data?.data[0]?.threshold ?? 0}
			onSaved={(): void => {
				void refetch();
				onDone();
			}}
			onCancel={onDone}
		/>
	);
}

export default ApdexSettingsForm;
