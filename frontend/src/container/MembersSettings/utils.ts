import type { AuthtypesUserWithRolesDTO } from 'api/generated/services/sigNoz.schemas';
import type { MemberRow } from 'components/MembersTable/MembersTable';
import { toISOString } from 'utils/app';

export function toMemberRow(user: AuthtypesUserWithRolesDTO): MemberRow {
	return {
		id: user.id,
		name: user.displayName,
		email: user.email ?? '',
		status: toMemberStatus(user.status ?? ''),
		joinedOn: toISOString(user.createdAt),
		updatedAt: toISOString(user.updatedAt),
	};
}

export enum FilterMode {
	All = 'all',
	Invited = 'invited',
}

export enum MemberStatus {
	Active = 'Active',
	Invited = 'Invited',
	Deleted = 'Deleted',
	Anonymous = 'Anonymous',
}

export enum UserApiStatus {
	Active = 'active',
	PendingInvite = 'pending_invite',
	Deleted = 'deleted',
}

export function toMemberStatus(apiStatus: string): MemberStatus {
	switch (apiStatus) {
		case UserApiStatus.PendingInvite:
			return MemberStatus.Invited;
		case UserApiStatus.Deleted:
			return MemberStatus.Deleted;
		case UserApiStatus.Active:
			return MemberStatus.Active;
		default:
			return MemberStatus.Anonymous;
	}
}
