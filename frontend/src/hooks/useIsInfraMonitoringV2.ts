import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

export function useIsInfraMonitoringV2(): boolean {
	const { featureFlags } = useAppContext();
	return Boolean(
		featureFlags?.find(
			(flag) => flag.name === FeatureKeys.USE_INFRA_MONITORING_V2,
		)?.active,
	);
}
