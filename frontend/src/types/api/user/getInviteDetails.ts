import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

import { Organization } from './getOrganization';
import { PayloadProps as LoginPrecheckPayloadProps } from './loginPrecheck';

export interface Props {
	inviteId: string;
}

export interface PayloadProps {
	data: InviteDetails;
	status: string;
}

export interface InviteDetails {
	createdAt: number;
	email: User['email'];
	name: User['displayName'];
	role: ROLES;
	token: string;
	organization: Organization['displayName'];
	precheck?: LoginPrecheckPayloadProps;
}
