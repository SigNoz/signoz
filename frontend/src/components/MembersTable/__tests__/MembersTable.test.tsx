import { MemberStatus } from 'container/MembersSettings/utils';
import { render, screen, userEvent } from 'tests/test-utils';

import MembersTable, { MemberRow } from '../MembersTable';

const mockActiveMembers: MemberRow[] = [
	{
		id: 'user-1',
		name: 'Alice Smith',
		email: 'alice@signoz.io',
		status: MemberStatus.Active,
		joinedOn: '1700000000000',
	},
	{
		id: 'user-2',
		name: 'Bob Jones',
		email: 'bob@signoz.io',
		status: MemberStatus.Active,
		joinedOn: null,
	},
];

const mockInvitedMember: MemberRow = {
	id: 'inv-abc',
	name: '',
	email: 'charlie@signoz.io',
	status: MemberStatus.Invited,
	joinedOn: null,
};

const defaultProps = {
	loading: false,
	total: 2,
	currentPage: 1,
	pageSize: 20,
	searchQuery: '',
	onPageChange: jest.fn(),
	onRowClick: jest.fn(),
};

describe('MembersTable', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders member rows with name, email, and ACTIVE status', () => {
		render(<MembersTable {...defaultProps} data={mockActiveMembers} />);

		expect(screen.getByText('Alice Smith')).toBeInTheDocument();
		expect(screen.getByText('alice@signoz.io')).toBeInTheDocument();
		expect(screen.getAllByText('ACTIVE')).toHaveLength(2);
	});

	it('renders INVITED badge for pending invite members', () => {
		render(
			<MembersTable
				{...defaultProps}
				data={[...mockActiveMembers, mockInvitedMember]}
				total={3}
			/>,
		);

		expect(screen.getByText('INVITED')).toBeInTheDocument();
		expect(screen.getByText('charlie@signoz.io')).toBeInTheDocument();
	});

	it('calls onRowClick with the member data when a row is clicked', async () => {
		const onRowClick = jest.fn() as jest.MockedFunction<
			(member: MemberRow) => void
		>;
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<MembersTable
				{...defaultProps}
				data={mockActiveMembers}
				onRowClick={onRowClick}
			/>,
		);

		await user.click(screen.getByText('Alice Smith'));

		expect(onRowClick).toHaveBeenCalledTimes(1);
		expect(onRowClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1', email: 'alice@signoz.io' }),
		);
	});

	it('renders DELETED badge and calls onRowClick when a deleted member row is clicked', async () => {
		const onRowClick = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const deletedMember: MemberRow = {
			id: 'user-del',
			name: 'Dave Deleted',
			email: 'dave@signoz.io',
			status: MemberStatus.Deleted,
			joinedOn: null,
		};

		render(
			<MembersTable
				{...defaultProps}
				data={[...mockActiveMembers, deletedMember]}
				total={3}
				onRowClick={onRowClick}
			/>,
		);

		expect(screen.getByText('DELETED')).toBeInTheDocument();
		await user.click(screen.getByText('Dave Deleted'));
		expect(onRowClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-del' }),
		);
	});

	it('shows "No members found" empty state when no data and no search query', () => {
		render(<MembersTable {...defaultProps} data={[]} total={0} searchQuery="" />);

		expect(screen.getByText('No members found')).toBeInTheDocument();
	});

	it('shows "No results for X" when no data and a search query is set', () => {
		render(
			<MembersTable {...defaultProps} data={[]} total={0} searchQuery="unknown" />,
		);

		expect(screen.getByText(/No results for/i)).toBeInTheDocument();
		expect(screen.getByText('unknown')).toBeInTheDocument();
	});

	it('hides pagination when total does not exceed pageSize', () => {
		const { container } = render(
			<MembersTable
				{...defaultProps}
				data={mockActiveMembers}
				total={2}
				pageSize={20}
			/>,
		);

		expect(
			container.querySelector('.members-table-pagination'),
		).not.toBeInTheDocument();
	});

	it('shows pagination when total exceeds pageSize', () => {
		const { container } = render(
			<MembersTable
				{...defaultProps}
				data={mockActiveMembers}
				total={25}
				pageSize={20}
			/>,
		);

		expect(
			container.querySelector('.members-table-pagination'),
		).toBeInTheDocument();
		expect(
			container.querySelector('.members-pagination-total'),
		).toBeInTheDocument();
	});
});
