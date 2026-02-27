import { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { ChevronDown, Plus } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import type { MenuProps } from 'antd';
import { Dropdown, Typography } from 'antd';
import getPendingInvites from 'api/v1/invite/get';
import getAll from 'api/v1/user/get';
import MembersTable, { MemberRow } from 'components/MembersTable/MembersTable';
import useUrlQuery from 'hooks/useUrlQuery';
import { useAppContext } from 'providers/App/App';

import InviteMemberModal from './InviteMemberModal/InviteMemberModal';

import './MembersSettings.styles.scss';

const PAGE_SIZE = 20;

type FilterMode = 'all' | 'invited';

function MembersSettings(): JSX.Element {
	const { org } = useAppContext();
	const history = useHistory();
	const urlQuery = useUrlQuery();

	const pageParam = parseInt(urlQuery.get('page') ?? '1', 10);
	const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

	const [searchQuery, setSearchQuery] = useState('');
	const [filterMode, setFilterMode] = useState<FilterMode>('all');
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

	const {
		data: usersData,
		isLoading: isUsersLoading,
		refetch: refetchUsers,
	} = useQuery({
		queryFn: getAll,
		queryKey: ['getOrgUser', org?.[0]?.id],
	});

	const {
		data: invitesData,
		isLoading: isInvitesLoading,
		refetch: refetchInvites,
	} = useQuery({
		queryFn: getPendingInvites,
		queryKey: ['getPendingInvites'],
	});

	const isLoading = isUsersLoading || isInvitesLoading;

	const allMembers = useMemo((): MemberRow[] => {
		const activeMembers: MemberRow[] = (usersData?.data ?? []).map((user) => ({
			id: user.id,
			name: user.displayName,
			email: user.email,
			role: user.role,
			status: 'Active' as const,
			joinedOn: user.createdAt ? String(user.createdAt) : null,
		}));

		const pendingInvites: MemberRow[] = (invitesData?.data ?? []).map(
			(invite) => ({
				id: `invite-${invite.id}`,
				name: invite.name ?? '',
				email: invite.email,
				role: invite.role,
				status: 'Invited' as const,
				joinedOn: null,
			}),
		);

		return [...activeMembers, ...pendingInvites];
	}, [usersData, invitesData]);

	const filteredMembers = useMemo((): MemberRow[] => {
		let result = allMembers;

		if (filterMode === 'invited') {
			result = result.filter((m) => m.status === 'Invited');
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(m) =>
					m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
			);
		}

		return result;
	}, [allMembers, filterMode, searchQuery]);

	const paginatedMembers = useMemo((): MemberRow[] => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filteredMembers.slice(start, start + PAGE_SIZE);
	}, [filteredMembers, currentPage]);

	const setPage = useCallback(
		(page: number): void => {
			urlQuery.set('page', String(page));
			history.replace({ search: urlQuery.toString() });
		},
		[history, urlQuery],
	);

	const pendingCount = invitesData?.data?.length ?? 0;
	const totalCount = allMembers.length;

	const filterMenuItems: MenuProps['items'] = [
		{
			key: 'all',
			label: (
				<div className="members-filter-option">
					<span>All members ⎯ {totalCount}</span>
					{filterMode === 'all' && (
						<span className="members-filter-option__check">✓</span>
					)}
				</div>
			),
			onClick: (): void => {
				setFilterMode('all');
				setPage(1);
			},
		},
		{
			key: 'invited',
			label: (
				<div className="members-filter-option">
					<span>Pending invites ⎯ {pendingCount}</span>
					{filterMode === 'invited' && (
						<span className="members-filter-option__check">✓</span>
					)}
				</div>
			),
			onClick: (): void => {
				setFilterMode('invited');
				setPage(1);
			},
		},
	];

	const filterLabel =
		filterMode === 'all'
			? `All members ⎯ ${totalCount}`
			: `Pending invites ⎯ ${pendingCount}`;

	const handleInviteSuccess = useCallback((): void => {
		refetchUsers();
		refetchInvites();
	}, [refetchUsers, refetchInvites]);

	return (
		<>
			<div className="members-settings">
				{/* Page header */}
				<div className="members-settings__header">
					<Typography.Title level={5} className="members-settings__title">
						Members
					</Typography.Title>
					<Typography.Text className="members-settings__subtitle">
						Overview of people added to this workspace.
					</Typography.Text>
				</div>

				{/* Controls row */}
				<div className="members-settings__controls">
					<Dropdown
						menu={{ items: filterMenuItems }}
						trigger={['click']}
						overlayClassName="members-filter-dropdown"
					>
						<Button
							variant="solid"
							size="sm"
							color="secondary"
							className="members-filter-trigger"
						>
							<span>{filterLabel}</span>
							<ChevronDown size={12} className="members-filter-trigger__chevron" />
						</Button>
					</Dropdown>

					<div className="members-settings__search">
						<Input
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e): void => {
								setSearchQuery(e.target.value);
								setPage(1);
							}}
							className="members-search-input"
							color="secondary"
						/>
					</div>

					<Button
						variant="solid"
						size="sm"
						color="primary"
						onClick={(): void => setIsInviteModalOpen(true)}
					>
						<Plus size={12} />
						Invite member
					</Button>
				</div>
			</div>
			{/* Table */}
			<MembersTable
				data={paginatedMembers}
				loading={isLoading}
				total={filteredMembers.length}
				currentPage={currentPage}
				pageSize={PAGE_SIZE}
				searchQuery={searchQuery}
				onPageChange={setPage}
			/>

			{/* Invite modal */}
			<InviteMemberModal
				open={isInviteModalOpen}
				onClose={(): void => setIsInviteModalOpen(false)}
				onSuccess={handleInviteSuccess}
			/>
		</>
	);
}

export default MembersSettings;
