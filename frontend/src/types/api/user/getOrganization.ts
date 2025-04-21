export interface Organization {
	createdAt: number;
	id: string;
	hName: string;
	name: string;
}

export type PayloadProps = Organization[];
