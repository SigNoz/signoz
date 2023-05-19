import { render, screen } from '@testing-library/react';

import MessageTip from './index';

describe('MessageTip', () => {
	it('should not render when show prop is false', () => {
		render(
			<MessageTip
				show={false}
				message="Test Message"
				action={<button type="button">Close</button>}
			/>,
		);

		const messageTip = screen.queryByRole('alert');

		expect(messageTip).toBeNull();
	});

	it('should render with the provided message and action', () => {
		const message = 'Test Message';
		const action = <button type="button">Close</button>;

		render(<MessageTip show message={message} action={action} />);

		const messageTip = screen.getByRole('alert');
		const messageText = screen.getByText(message);
		const actionButton = screen.getByRole('button', { name: 'Close' });

		expect(messageTip).toBeInTheDocument();
		expect(messageText).toBeInTheDocument();
		expect(actionButton).toBeInTheDocument();
	});

	// taken from antd docs
	// https://github.com/ant-design/ant-design/blob/master/components/alert/__tests__/index.test.tsx
	it('custom action', () => {
		const { container } = render(
			<MessageTip
				show
				message="Success Tips"
				action={<button type="button">Close</button>}
			/>,
		);
		expect(container.firstChild).toMatchSnapshot();
	});
});
