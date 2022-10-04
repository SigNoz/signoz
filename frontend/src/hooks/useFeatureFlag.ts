import _get from 'lodash-es/get';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

const useFeatureFlag = (flagKey: string): boolean => {
	const { featureFlags } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	return _get(featureFlags, flagKey, false);
};

export default useFeatureFlag;
