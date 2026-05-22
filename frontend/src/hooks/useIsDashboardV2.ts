import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

export function useIsDashboardV2(): boolean {
	const { featureFlags } = useAppContext();
	return Boolean(
		featureFlags?.find((flag) => flag.name === FeatureKeys.DASHBOARD_V2)?.active,
	);
}
