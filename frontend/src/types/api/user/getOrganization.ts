export interface Organization {
	createdAt: number;
	id: string;
	displayName: string;
	name: string;
}

export type PayloadProps = Organization[];
