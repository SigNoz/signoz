export interface Props {
	name: string;
	isAnonymous: boolean;
	orgId: string;
	hasOptedUpdates?: boolean;
}

export interface PayloadProps {
	data: string;
}
