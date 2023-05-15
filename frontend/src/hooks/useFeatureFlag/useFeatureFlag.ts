import { FeatureKeys } from 'constants/features';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { PayloadProps as FeatureFlagPayload } from 'types/api/features/getFeaturesFlags';
import AppReducer from 'types/reducer/app';

const useFeatureFlag = (
	flagKey: keyof typeof FeatureKeys,
): FlatArray<FeatureFlagPayload, 1> | undefined => {
	const { featureFlags = [] } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const feature = featureFlags?.find((flag) => flag.name === flagKey);

	if (!feature) {
		return undefined;
	}

	return feature;
};

export default useFeatureFlag;
