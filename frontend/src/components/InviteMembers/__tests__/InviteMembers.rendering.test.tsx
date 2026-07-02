import { server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';

import InviteMembers from '../InviteMembers';

import { createRolesHandler, createSuccessHandler } from './testUtils';

describe('InviteMembers - Rendering', () => {
	beforeEach(() => {
		server.use(createRolesHandler(), createSuccessHandler());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders default initial row count of 3', () => {
		render(<InviteMembers />);

		const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
		expect(emailInputs).toHaveLength(3);
	});

	it('renders custom initial row count', () => {
		render(<InviteMembers initialRowCount={5} />);

		const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
		expect(emailInputs).toHaveLength(5);
	});

	it('renders header by default', () => {
		render(<InviteMembers />);

		expect(screen.getByText('Email address')).toBeInTheDocument();
		expect(screen.getByText('Role')).toBeInTheDocument();
	});

	it('hides header when showHeader is false', () => {
		render(<InviteMembers showHeader={false} />);

		expect(screen.queryByText('Email address')).not.toBeInTheDocument();
		expect(screen.queryByText('Role')).not.toBeInTheDocument();
	});

	it('renders add button by default', () => {
		render(<InviteMembers />);

		expect(
			screen.getByRole('button', { name: /add another/i }),
		).toBeInTheDocument();
	});

	it('hides add button when showAddButton is false', () => {
		render(<InviteMembers showAddButton={false} />);

		expect(
			screen.queryByRole('button', { name: /add another/i }),
		).not.toBeInTheDocument();
	});

	it('renders custom email placeholder', () => {
		render(<InviteMembers emailPlaceholder="custom@placeholder.com" />);

		const emailInputs = screen.getAllByPlaceholderText('custom@placeholder.com');
		expect(emailInputs).toHaveLength(3);
	});

	it('applies custom className', () => {
		const { container } = render(<InviteMembers className="custom-class" />);

		expect(container.querySelector('.custom-class')).toBeInTheDocument();
	});

	it('renders footer via renderFooter prop', () => {
		render(
			<InviteMembers
				renderFooter={({ canSubmit }): JSX.Element => (
					<button data-testid="custom-footer" disabled={!canSubmit}>
						Custom Submit
					</button>
				)}
			/>,
		);

		expect(screen.getByTestId('custom-footer')).toBeInTheDocument();
		expect(screen.getByTestId('custom-footer')).toBeDisabled();
	});

	it('renders role select for each row', () => {
		render(<InviteMembers initialRowCount={2} />);

		const roleSelects = screen.getAllByText('Select role');
		expect(roleSelects).toHaveLength(2);
	});
});
