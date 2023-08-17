import { FeatureKeys } from 'constants/features';

export const isFeatureKeys = (key: string): key is keyof typeof FeatureKeys =>
	Object.keys(FeatureKeys).includes(key);
