import { act, render, screen } from 'tests/test-utils';

import WorkspaceLocked from '.';

describe('WorkspaceLocked', () => {
	test('Should render the component', async () => {
		act(() => {
			render(<WorkspaceLocked />);
		});
		const workspaceLocked = screen.getByRole('heading', {
			name: /workspace locked/i,
		});
		expect(workspaceLocked).toBeInTheDocument();

		const gotQuestionText = screen.getByText(/got question?/i);
		expect(gotQuestionText).toBeInTheDocument();

		const contactUsLink = screen.getByRole('link', {
			name: /contact us/i,
		});
		expect(contactUsLink).toBeInTheDocument();
	});

	test('Render for Admin', async () => {
		render(<WorkspaceLocked />);
		const contactAdminMessage = screen.queryByText(
			/please contact your administrator for further help/i,
		);
		expect(contactAdminMessage).not.toBeInTheDocument();
		const updateCreditCardBtn = screen.getByRole('button', {
			name: /update credit card/i,
		});
		expect(updateCreditCardBtn).toBeInTheDocument();
	});

	test('Render for non Admin', async () => {
		render(<WorkspaceLocked />, {}, 'VIEWER');
		const updateCreditCardBtn = screen.queryByRole('button', {
			name: /update credit card/i,
		});
		expect(updateCreditCardBtn).not.toBeInTheDocument();

		const contactAdminMessage = screen.getByText(
			/please contact your administrator for further help/i,
		);
		expect(contactAdminMessage).toBeInTheDocument();
	});
});
