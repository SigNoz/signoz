import { OrgPreference, UserPreference } from './preference';

export interface Props {
	name: string;
}

export interface PayloadProps {
	status: string;
	data: OrgPreference | UserPreference;
}
