/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	AuthtypesUserRoleDTO,
	CreateUser201,
	GetResetPasswordToken200,
	GetUser200,
	ListUsers200,
	TypesUserDTO,
} from 'api/generated/services/sigNoz.schemas';
import { RoleType } from 'types/roles';
import { UserApiStatus } from 'container/MembersSettings/utils';

export const ACTIVE_MEMBER_MAX = 26;
export const INVITED_MEMBER_MAX = 6;
export const DELETED_MEMBER_MAX = 4;

const NAMES = [
	'Jon Snow',
	'Arya Stark',
	'Samwell Tarly',
	'Brienne of Tarth',
	'Davos Seaworth',
	'Missandei Naath',
	'Tormund Giantsbane',
	'Gilly Craster',
	'Podrick Payne',
	'Yara Greyjoy',
	'Grey Worm',
	'Beric Dondarrion',
	'Meera Reed',
	'Edd Tollett',
	'Alys Karstark',
	'Lyanna Mormont',
	'Gendry Baratheon',
	'Ellaria Sand',
	'Qyburn Maester',
	'Jaqen Hghar',
	'Osha Wildling',
	'Hot Pie',
	'Anguy Archer',
	'Jorah Mormont',
	'Rakharo Dothraki',
	'Doreah Lysene',
];

const DAY = 24 * 60 * 60 * 1000;

/** Fixed epoch so the "joined on" column does not move between renders. */
const JOINED_AT = Date.UTC(2026, 2, 3, 8, 0);

const emailFor = (name: string): string =>
	`${name.toLowerCase().replace(/[^a-z]+/g, '.')}@nightswatch.io`;

const user = (index: number, status: UserApiStatus): TypesUserDTO => {
	const name = NAMES[index % NAMES.length];

	return {
		id: `user-${status}-${index}`,
		displayName: name,
		email: emailFor(name),
		orgId: 'story-org',
		status,
		createdAt: new Date(JOINED_AT - index * DAY).toISOString(),
		updatedAt: new Date(JOINED_AT - index * DAY + 3600_000).toISOString(),
	};
};

interface MemberCounts {
	active: number;
	invited: number;
	deleted: number;
}

export const usersResponse = ({
	active,
	invited,
	deleted,
}: MemberCounts): ListUsers200 => ({
	status: 'success',
	data: [
		...Array.from({ length: active }, (_, index) =>
			user(index, UserApiStatus.Active),
		),
		...Array.from({ length: invited }, (_, index) =>
			user(index + active, UserApiStatus.PendingInvite),
		),
		...Array.from({ length: deleted }, (_, index) =>
			user(index + active + invited, UserApiStatus.Deleted),
		),
	],
});

const userRole = (userId: string): AuthtypesUserRoleDTO => ({
	id: `user-role-${userId}`,
	userId,
	roleId: 'role-editor',
	role: {
		id: 'role-editor',
		name: 'editor',
		description: 'Can create and change dashboards, alerts and views.',
		orgId: 'story-org',
		type: RoleType.MANAGED,
		transactionGroups: [],
	},
	createdAt: new Date(JOINED_AT).toISOString(),
	updatedAt: new Date(JOINED_AT).toISOString(),
});

/**
 * The drawer reads the member's roles off the user record rather than a roles
 * endpoint, and the join-row id is what a role removal is keyed on.
 */
export const userDetailResponse = (id: string): GetUser200 => {
	const index = Number.parseInt(id.split('-').pop() ?? '0', 10);
	const status = id.includes(UserApiStatus.PendingInvite)
		? UserApiStatus.PendingInvite
		: id.includes(UserApiStatus.Deleted)
			? UserApiStatus.Deleted
			: UserApiStatus.Active;

	return {
		status: 'success',
		data: { ...user(index, status), userRoles: [userRole(id)] },
	};
};

export const RESET_TOKEN_STATES = ['valid', 'expired'] as const;

export type ResetTokenState = (typeof RESET_TOKEN_STATES)[number];

/**
 * An invite is a reset-password token with an expiry: past it, the drawer offers
 * a new link instead of the one that was mailed out.
 */
export const resetPasswordTokenResponse = (
	state: ResetTokenState,
): GetResetPasswordToken200 => ({
	status: 'success',
	data: {
		id: 'reset-token-1',
		passwordId: 'password-1',
		token: 'storybook-invite-token',
		expiresAt: new Date(
			state === 'expired' ? JOINED_AT - DAY : Date.now() + 3 * DAY,
		).toISOString(),
	},
});

export const createdUserResponse = (): CreateUser201 => ({
	status: 'success',
	data: { id: 'user-active-new' },
});

export const RESET_LINK_OUTCOMES = [
	'success',
	'no-token',
	'loading',
	'error',
] as const;

export type ResetLinkOutcome = (typeof RESET_LINK_OUTCOMES)[number];

/** A reset-token response that carries no token, which the drawer reports as a failure. */
export const emptyResetTokenResponse = (): GetResetPasswordToken200 => ({
	status: 'success',
	data: {
		id: 'reset-token-1',
		passwordId: 'password-1',
		token: '',
		expiresAt: new Date(JOINED_AT).toISOString(),
	},
});

/** An invite for an address the backend refuses, to leave a batch half sent. */
export const BLOCKED_INVITE_DOMAIN = 'blocked.example';
