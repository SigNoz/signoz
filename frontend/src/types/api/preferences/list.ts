import { OrgPreference, UserPreference } from './preference';

export interface PayloadProps {
	status: string;
	data: OrgPreference[] | UserPreference[];
}
