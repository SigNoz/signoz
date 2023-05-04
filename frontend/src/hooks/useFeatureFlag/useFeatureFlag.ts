import { FeatureKeys } from 'constants/features';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

const useFeatureFlag = (flagKey: keyof typeof FeatureKeys): boolean => {
	const { featureFlags = [] } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const feature = featureFlags?.find((flag) => flag.name === flagKey);

	return !feature?.active || false;
};

export default useFeatureFlag;
