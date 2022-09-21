import _get from 'lodash-es/get';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

const useFeatureFlag = (flagKey: string): boolean => {
	const { featureFlags } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	console.log('featureFlags:', featureFlags);
	console.log('val:', _get(featureFlags, flagKey, false));
	return _get(featureFlags, flagKey, false);
};

export default useFeatureFlag;
