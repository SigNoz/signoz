import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

export function useIsBodyJsonEnabled(): boolean {
	const { featureFlags } = useAppContext();
	return (
		featureFlags?.find((flag) => flag.name === FeatureKeys.USE_JSON_BODY)
			?.active ?? false
	);
}
