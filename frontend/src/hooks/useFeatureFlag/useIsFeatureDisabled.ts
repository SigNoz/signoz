import { FeatureKeys } from 'constants/features';

import useFeatureFlag from './useFeatureFlag';

const useIsFeatureDisabled = (props: keyof typeof FeatureKeys): boolean => {
	const feature = useFeatureFlag(props);

	return !feature?.active ?? false;
};

export default useIsFeatureDisabled;
