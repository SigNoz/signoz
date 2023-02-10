import { User } from 'types/reducer/app';

export interface UserFlags {
	ReleaseNote0120Hide?: string;
}

export type PayloadProps = UserFlags;

export interface Props {
	userId: User['userId'];
	flags: UserFlags;
}
