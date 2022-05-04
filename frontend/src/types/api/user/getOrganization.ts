export interface Organization {
	createdAt: number;
	hasOptedUpdates: boolean;
	id: string;
	isAnonymous: boolean;
	name: string;
}

export type PayloadProps = Organization[];
