import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import APIError from 'types/api/error';

import ErrorModal from './ErrorModal';

// Mock the query client to return version data
const mockVersionData = {
	payload: {
		ee: 'Y',
		version: '1.0.0',
	},
};
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueryClient: (): { getQueryData: () => typeof mockVersionData } => ({
		getQueryData: jest.fn(() => mockVersionData),
	}),
}));
const mockError: APIError = new APIError({
	httpStatusCode: 400,
	error: {
		// eslint-disable-next-line sonarjs/no-duplicate-string
		message: 'Something went wrong while processing your request.',
		// eslint-disable-next-line sonarjs/no-duplicate-string
		code: 'An error occurred',
		// eslint-disable-next-line sonarjs/no-duplicate-string
		url: 'https://example.com/docs',
		errors: [
			{ message: 'First error detail' },
			{ message: 'Second error detail' },
			{ message: 'Third error detail' },
		],
	},
});
describe('ErrorModal Component', () => {
	it('should render the modal when open is true', () => {
		render(<ErrorModal error={mockError} open onClose={jest.fn()} />);

		// Check if the error message is displayed
		expect(screen.getByText('An error occurred')).toBeInTheDocument();
		expect(
			screen.getByText('Something went wrong while processing your request.'),
		).toBeInTheDocument();
	});

	it('should not render the modal when open is false', () => {
		render(<ErrorModal error={mockError} open={false} onClose={jest.fn()} />);

		// Check that the modal content is not in the document
		expect(screen.queryByText('An error occurred')).not.toBeInTheDocument();
	});

	it('should call onClose when the close button is clicked', async () => {
		const onCloseMock = jest.fn();
		render(<ErrorModal error={mockError} open onClose={onCloseMock} />);

		// Click the close button
		const closeButton = screen.getByTestId('close-button');
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(closeButton);

		// Check if onClose was called
		expect(onCloseMock).toHaveBeenCalledTimes(1);
	});

	it('should display version data if available', async () => {
		render(<ErrorModal error={mockError} open onClose={jest.fn()} />);

		// Check if the version data is displayed
		expect(screen.getByText('ENTERPRISE')).toBeInTheDocument();
		expect(screen.getByText('1.0.0')).toBeInTheDocument();
	});
	it('should render the messages count badge when there are multiple errors', () => {
		render(<ErrorModal error={mockError} open onClose={jest.fn()} />);

		// Check if the messages count badge is displayed
		expect(screen.getByText('MESSAGES')).toBeInTheDocument();

		expect(screen.getByText('3')).toBeInTheDocument();

		// Check if the individual error messages are displayed
		expect(screen.getByText('First error detail')).toBeInTheDocument();
		expect(screen.getByText('Second error detail')).toBeInTheDocument();
		expect(screen.getByText('Third error detail')).toBeInTheDocument();
	});

	it('should render the open docs button when URL is provided', async () => {
		render(<ErrorModal error={mockError} open onClose={jest.fn()} />);

		// Check if the open docs button is displayed
		const openDocsButton = screen.getByTestId('error-docs-button');

		expect(openDocsButton).toBeInTheDocument();

		expect(openDocsButton).toHaveAttribute('href', 'https://example.com/docs');

		expect(openDocsButton).toHaveAttribute('target', '_blank');
	});

	it('should not display scroll for more if there are less than 10 messages', () => {
		render(<ErrorModal error={mockError} open onClose={jest.fn()} />);

		expect(screen.queryByText('Scroll for more')).not.toBeInTheDocument();
	});
	it('should display scroll for more if there are more than 10 messages', async () => {
		const longError = new APIError({
			httpStatusCode: 400,
			error: {
				...mockError.error,
				code: 'An error occurred',
				message: 'Something went wrong while processing your request.',
				url: 'https://example.com/docs',
				errors: Array.from({ length: 15 }, (_, i) => ({
					message: `Error detail ${i + 1}`,
				})),
			},
		});

		render(<ErrorModal error={longError} open onClose={jest.fn()} />);

		// Check if the scroll hint is displayed
		expect(screen.getByText('Scroll for more')).toBeInTheDocument();
	});
});
it('should render the trigger component if provided', () => {
	const mockTrigger = <button type="button">Open Error Modal</button>;
	render(
		<ErrorModal
			error={mockError}
			triggerComponent={mockTrigger}
			onClose={jest.fn()}
		/>,
	);

	// Check if the trigger component is rendered
	expect(screen.getByText('Open Error Modal')).toBeInTheDocument();
});

it('should open the modal when the trigger component is clicked', async () => {
	const mockTrigger = <button type="button">Open Error Modal</button>;
	render(
		<ErrorModal
			error={mockError}
			triggerComponent={mockTrigger}
			onClose={jest.fn()}
		/>,
	);

	// Click the trigger component
	const triggerButton = screen.getByText('Open Error Modal');
	const user = userEvent.setup({ pointerEventsCheck: 0 });
	await user.click(triggerButton);

	// Check if the modal is displayed
	expect(screen.getByText('An error occurred')).toBeInTheDocument();
});

it('should render the default trigger tag if no trigger component is provided', () => {
	render(<ErrorModal error={mockError} onClose={jest.fn()} />);

	// Check if the default trigger tag is rendered
	expect(screen.getByText('error')).toBeInTheDocument();
});

it('should close the modal when the onCancel event is triggered', async () => {
	const onCloseMock = jest.fn();
	render(<ErrorModal error={mockError} onClose={onCloseMock} />);

	// Click the trigger component
	const triggerButton = screen.getByText('error');
	const user = userEvent.setup({ pointerEventsCheck: 0 });
	await user.click(triggerButton);

	await waitFor(() => {
		expect(screen.getByText('An error occurred')).toBeInTheDocument();
	});

	// Trigger the onCancel event
	await user.click(screen.getByTestId('close-button'));

	// Check if the modal is closed
	expect(onCloseMock).toHaveBeenCalledTimes(1);

	await waitFor(() => {
		// check if the modal is not visible
		const modal = document.getElementsByClassName('ant-modal');
		const style = window.getComputedStyle(modal[0]);
		expect(style.display).toBe('none');
	});
});
