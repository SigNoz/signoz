import { FeatureKeys } from 'constants/features';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { FeatureFlagProps as FeatureFlagPayload } from 'types/api/features/getFeaturesFlags';
import AppReducer from 'types/reducer/app';

const useFeatureFlag = (
	flagKey: keyof typeof FeatureKeys,
): FeatureFlagPayload | undefined => {
	const { featureResponse = [] } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	if (featureResponse === null) return undefined;

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const featureResponseData = featureResponse.data as FeatureFlagPayload[];

	const feature = featureResponseData?.find((flag) => flag.name === flagKey);

	if (!feature) {
		return undefined;
	}

	return feature;
};

export default useFeatureFlag;
