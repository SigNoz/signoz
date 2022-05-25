import { TTTLType } from './common';

export interface Props {
	type: TTTLType;
	totalDuration: string;
	coldStorage?: 's3' | null;
	toColdDuration?: string;
}

export interface PayloadProps {
	success: 'message';
}
