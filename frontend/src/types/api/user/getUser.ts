import { UserFlags } from 'types/api/user/setFlags';
import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	userId: User['userId'];
	token?: string;
}

export interface PayloadProps {
	createdAt: number;
	email: string;
	id: string;
	name: string;
	orgId: string;
	profilePictureURL: string;
	organization: string;
	role: ROLES;
	flags: UserFlags;
	groupId: string;
}
