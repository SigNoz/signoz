import { License } from './def';

export type PayloadProps = {
	trialStart: number;
	trialEnd: number;
	onTrial: boolean;
	workSpaceBlock: boolean;
	trialConvertedToSubscription: boolean;
	gracePeriodEnd: number;
	licenses: License[];
};
