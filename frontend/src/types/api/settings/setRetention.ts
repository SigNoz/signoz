export interface Props {
	type: 'metrics' | 'traces';
	totalDuration: string;
	coldStorage?: 's3' | null;
	toColdDuration?: string;
}

export interface PayloadProps {
	success: 'message';
}
