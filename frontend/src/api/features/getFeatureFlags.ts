import axios from 'api';
import { ApiResponse } from 'types/api';
import { FeatureFlagProps } from 'types/api/features/getFeaturesFlags';

const getFeaturesFlags = (): Promise<FeatureFlagProps[]> =>
	axios
		.get<ApiResponse<FeatureFlagProps[]>>(`/featureFlags`)
		.then((response) => response.data.data);

export default getFeaturesFlags;
