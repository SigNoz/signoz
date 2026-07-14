export enum FilterMode {
	All = 'all',
	Invited = 'invited',
	Deleted = 'deleted',
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
