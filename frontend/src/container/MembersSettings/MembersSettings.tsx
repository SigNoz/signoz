import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Check, ChevronDown, Plus } from '@signozhq/icons';
import { Button, Input } from '@signozhq/ui';
import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { useListUsers } from 'api/generated/services/users';
import EditMemberDrawer from 'components/EditMemberDrawer/EditMemberDrawer';
import InviteMembersModal from 'components/InviteMembersModal/InviteMembersModal';
import MembersTable, { MemberRow } from 'components/MembersTable/MembersTable';
import useUrlQuery from 'hooks/useUrlQuery';
import { toISOString } from 'utils/app';

import { FilterMode, MemberStatus, toMemberStatus } from './utils';

import './MembersSettings.styles.scss';

const PAGE_SIZE = 20;

function MembersSettings(): JSX.Element {
	const history = useHistory();
	const urlQuery = useUrlQuery();

	const pageParam = parseInt(urlQuery.get('page') ?? '1', 10);
	const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

	// TODO(nuqs): Replace with nuqs once the nuqs setup and integration is done - for search
	const [searchQuery, setSearchQuery] = useState('');
	const [filterMode, setFilterMode] = useState<FilterMode>(FilterMode.All);
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

	const { data: usersData, isLoading, refetch: refetchUsers } = useListUsers();

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
			history.replace({ search: urlQuery.toString() });
		},
		[history, urlQuery],
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

	const filterMenuItems: MenuProps['items'] = [
		{
			key: FilterMode.All,
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
			key: FilterMode.Invited,
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
			key: FilterMode.Deleted,
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
		refetchUsers();
	}, [refetchUsers]);

	const handleRowClick = useCallback((member: MemberRow): void => {
		setSelectedMember(member);
	}, []);

	const handleDrawerClose = useCallback((): void => {
		setSelectedMember(null);
	}, []);

	const handleMemberEditComplete = useCallback((): void => {
		refetchUsers();
	}, [refetchUsers]);

	return (
		<>
			<div className="members-settings">
				<div className="members-settings__header">
					<h1 className="members-settings__title">Members</h1>
					<p className="members-settings__subtitle">
						Overview of people added to this workspace.
					</p>
				</div>

				<div className="members-settings__controls">
					<Dropdown
						menu={{ items: filterMenuItems }}
						trigger={['click']}
						overlayClassName="members-filter-dropdown"
					>
						<Button
							variant="solid"
							color="secondary"
							className="members-filter-trigger"
						>
							<span>{filterLabel}</span>
							<ChevronDown size={12} className="members-filter-trigger__chevron" />
						</Button>
					</Dropdown>

					<div className="members-settings__search">
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
						/>
					</div>

					<Button
						variant="solid"
						color="primary"
						onClick={(): void => setIsInviteModalOpen(true)}
					>
						<Plus size={12} />
						Invite member
					</Button>
				</div>
			</div>
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

			<InviteMembersModal
				open={isInviteModalOpen}
				onClose={(): void => setIsInviteModalOpen(false)}
				onComplete={handleInviteComplete}
			/>

			<EditMemberDrawer
				member={selectedMember}
				open={selectedMember !== null}
				onClose={handleDrawerClose}
				onComplete={handleMemberEditComplete}
			/>
		</>
	);
}

export default MembersSettings;
