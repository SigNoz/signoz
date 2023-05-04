import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

const useFeatureFlag = (flagKey: string): boolean => {
	const { featureFlags } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	if (featureFlags) {
		return featureFlags[flagKey] || false;
	}

	return false;
};

export default useFeatureFlag;
