export interface License {
	key: string;
	ValidFrom: Date;
	ValidUntil: Date;
	planKey: string;
	status: string;
	isCurrent: boolean;
}
