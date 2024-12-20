export interface Props {
	name: string;
	orgName: string;
	email: string;
	password: string;
	token?: string;
	sourceUrl?: string;
	isAnonymous?: boolean;
	hasOptedUpdates?: boolean;
}
