import { TTTLType } from './common';

export interface Props {
	type: TTTLType;
	totalDuration: string;
	coldStorage?: 's3' | null;
	toColdDuration?: string;
}

export interface PropsV2 {
	type: TTTLType;
	defaultTTLDays: number;
	coldStorageVolume: string;
	coldStorageDurationDays: number;
	ttlConditions: {
		conditions: {
			key: string;
			values: string[];
		}[];
		ttlDays: number;
	}[];
}
export interface PayloadProps {
	success: 'message';
}

export interface PayloadPropsV2 {
	message: string;
}
