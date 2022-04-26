import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	userId: User['userId'];
}

export interface PayloadProps {
	group_name: ROLES;
	user_id: string;
}
