import { FeatureKeys } from 'constants/features';

export interface FeatureFlagProps {
	name: FeatureKeys;
	active: boolean;
	usage: number;
	usage_limit: number;
	route: string;
}

export type PayloadProps = FeatureFlagProps[];
