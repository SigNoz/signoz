import _get from 'lodash-es/get';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { FeatureFlag } from 'types/reducer/app';

// type FlagName = valueof FeatureFlag
const useFeatureFlag = (
	flagName: string,
	domain: keyof FeatureFlag,
): boolean => {
	const allFeatureFlag = useSelector<AppState>(
		(state) => state.app.features[domain],
	);

	return _get(allFeatureFlag, flagName, false);
};

export default useFeatureFlag;
