import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

export function useIsAIObservabilityEnabled(): boolean {
	const { featureFlags } = useAppContext();
	return (
		featureFlags?.find(
			(flag) => flag.name === FeatureKeys.ENABLE_AI_OBSERVABILITY,
		)?.active || false
	);
}
