import { useCallback, useEffect, useMemo, useState } from 'react';
import { navigate } from 'lib/router/navigation';
import { Check, ChevronDown, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { Input } from '@signozhq/ui/input';
import { useListUsers } from 'api/generated/services/users';
import EditMemberDrawer from 'components/EditMemberDrawer/EditMemberDrawer';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import InviteMembersModal from 'container/MembersSettings/components/InviteMembersModal/InviteMembersModal';
import MembersTable, { MemberRow } from 'components/MembersTable/MembersTable';
import useUrlQuery from 'hooks/useUrlQuery';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import {
	UserCreatePermission,
	UserListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/user.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { toISOString } from 'utils/app';
import { toAPIError } from 'utils/errorUtils';

import { FilterMode, MemberStatus, toMemberStatus } from './utils';

import './MembersSettings.styles.scss';
import AuthZButton from '@/lib/authz/components/AuthZButton/AuthZButton';

const PAGE_SIZE = 20;

function MembersSettings(): JSX.Element {
	const urlQuery = useUrlQuery();
	const pageParam = parseInt(urlQuery.get('page') ?? '1', 10);
	const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

	const { permissions: authzPermissions, isLoading: isAuthZLoading } = useAuthZ([
		UserListPermission,
	]);

	// TODO(nuqs): Replace with nuqs once the nuqs setup and integration is done - for search
	const [searchQuery, setSearchQuery] = useState('');
	const [filterMode, setFilterMode] = useState<FilterMode>(FilterMode.All);
	const [isInviteModalOpen, setIsInviteModalOpen] = useQueryState(
		'invite',
		parseAsBoolean.withDefault(false),
	);
	const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

	const canListUsers =
		authzPermissions?.[UserListPermission]?.isGranted ?? false;

	const {
		data: usersData,
		isLoading,
		refetch: refetchUsers,
		isError,
		error,
	} = useListUsers({ query: { enabled: canListUsers } });

	const controlsDisabled = !canListUsers || isAuthZLoading;

	const allMembers = useMemo(
		(): MemberRow[] =>
			(usersData?.data ?? []).map((user) => ({
				id: user.id,
				name: user.displayName,
				email: user.email ?? '',
				status: toMemberStatus(user.status ?? ''),
				joinedOn: toISOString(user.createdAt),
				updatedAt: toISOString(user?.updatedAt),
			})),
		[usersData],
	);

	const filteredMembers = useMemo((): MemberRow[] => {
		let result = allMembers;

		if (filterMode === FilterMode.Invited) {
			result = result.filter((m) => m.status === MemberStatus.Invited);
		} else if (filterMode === FilterMode.Deleted) {
			result = result.filter((m) => m.status === MemberStatus.Deleted);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(m) =>
					m?.name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
			);
		}

		return result;
	}, [allMembers, filterMode, searchQuery]);

	// TODO(nuqs): Replace with nuqs once the nuqs setup and integration is done
	const setPage = useCallback(
		(page: number): void => {
			urlQuery.set('page', String(page));
			navigate({ search: urlQuery.toString() }, { replace: true });
		},
		[urlQuery],
	);

	useEffect(() => {
		if (filteredMembers.length === 0) {
			return;
		}
		const maxPage = Math.ceil(filteredMembers.length / PAGE_SIZE);
		if (currentPage > maxPage) {
			setPage(maxPage);
		}
		if (currentPage < 1) {
			setPage(1);
		}
	}, [filteredMembers.length, currentPage, setPage]);

	const pendingCount = allMembers.filter(
		(m) => m.status === MemberStatus.Invited,
	).length;
	const deletedCount = allMembers.filter(
		(m) => m.status === MemberStatus.Deleted,
	).length;
	const totalCount = allMembers.length;

	const filterMenuItems: DropdownItemType[] = [
		{
			type: 'item',
			value: FilterMode.All,
			label: (
				<div className="members-filter-option">
					<span>All members ⎯ {totalCount}</span>
					{filterMode === FilterMode.All && <Check size={14} />}
				</div>
			),
			onClick: (): void => {
				setFilterMode(FilterMode.All);
				setPage(1);
			},
		},
		{
			type: 'item',
			value: FilterMode.Invited,
			label: (
				<div className="members-filter-option">
					<span>Pending invites ⎯ {pendingCount}</span>
					{filterMode === FilterMode.Invited && <Check size={14} />}
				</div>
			),
			onClick: (): void => {
				setFilterMode(FilterMode.Invited);
				setPage(1);
			},
		},
		{
			type: 'item',
			value: FilterMode.Deleted,
			label: (
				<div className="members-filter-option">
					<span>Deleted ⎯ {deletedCount}</span>
					{filterMode === FilterMode.Deleted && <Check size={14} />}
				</div>
			),
			onClick: (): void => {
				setFilterMode(FilterMode.Deleted);
				setPage(1);
			},
		},
	];

	const filterLabel =
		filterMode === FilterMode.All
			? `All members ⎯ ${totalCount}`
			: filterMode === FilterMode.Invited
				? `Pending invites ⎯ ${pendingCount}`
				: `Deleted ⎯ ${deletedCount}`;

	const handleInviteComplete = useCallback((): void => {
		void refetchUsers();
	}, [refetchUsers]);

	const handleRowClick = useCallback((member: MemberRow): void => {
		setSelectedMember(member);
	}, []);

	const handleDrawerClose = useCallback((): void => {
		setSelectedMember(null);
	}, []);

	const handleMemberEditComplete = useCallback((): void => {
		void refetchUsers();
	}, [refetchUsers]);

	return (
		<div className="members-settings-page">
			<div className="members-settings">
				<div className="members-settings__header">
					<h1 className="members-settings__title">Members</h1>
					<p className="members-settings__subtitle">
						Overview of people added to this workspace.
					</p>
				</div>

				<div className="members-settings__controls">
					<AuthZTooltip checks={[UserListPermission]}>
						<span>
							<Dropdown
								disabled={controlsDisabled}
								disabledTooltip={undefined}
								items={filterMenuItems}
								nativeButton
								align="end"
								side="bottom"
							>
								<Button
									size="md"
									variant="solid"
									color="secondary"
									loading={isAuthZLoading}
									disabled={!canListUsers}
									disabledTooltip={undefined}
									suffix={
										<ChevronDown size={12} className="members-filter-trigger__chevron" />
									}
									testId="members-filter-trigger"
								>
									<span>{filterLabel}</span>
								</Button>
							</Dropdown>
						</span>
					</AuthZTooltip>

					<div className="members-settings__search">
						<AuthZTooltip
							checks={[UserListPermission]}
							triggerClassName="members-settings__search-trigger"
						>
							<Input
								type="search"
								placeholder="Search by name or email..."
								value={searchQuery}
								onChange={(e): void => {
									setSearchQuery(e.target.value);
									setPage(1);
								}}
								className="members-search-input"
								name="members-search"
								testId="members-search-input"
								disabled={controlsDisabled}
							/>
						</AuthZTooltip>
					</div>

					<AuthZButton
						size="md"
						variant="solid"
						color="primary"
						checks={[UserCreatePermission]}
						onClick={(): void => void setIsInviteModalOpen(true)}
						prefix={<Plus size={12} />}
						testId="invite-member-btn"
					>
						Invite member
					</AuthZButton>
				</div>
			</div>
			<AuthZGuardContent checks={[UserListPermission]}>
				{isError ? (
					<ErrorInPlace
						error={toAPIError(
							error,
							'An unexpected error occurred while fetching members.',
						)}
					/>
				) : (
					<MembersTable
						data={filteredMembers}
						loading={isLoading}
						total={filteredMembers.length}
						currentPage={currentPage}
						pageSize={PAGE_SIZE}
						searchQuery={searchQuery}
						onPageChange={setPage}
						onRowClick={handleRowClick}
					/>
				)}
			</AuthZGuardContent>

			<InviteMembersModal
				open={isInviteModalOpen}
				onClose={(): void => void setIsInviteModalOpen(null)}
				onComplete={handleInviteComplete}
			/>

			<EditMemberDrawer
				member={selectedMember}
				onClose={handleDrawerClose}
				onComplete={handleMemberEditComplete}
			/>
		</div>
	);
}

export default MembersSettings;
