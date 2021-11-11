export interface Props {
	type: 'metrics' | 'traces';
	duration: string;
}

export interface PayloadProps {
	success: 'message';
}
