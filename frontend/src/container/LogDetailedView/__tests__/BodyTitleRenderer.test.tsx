import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import BodyTitleRenderer from '../BodyTitleRenderer';

let mockSetCopy: jest.Mock;
const mockNotification = jest.fn();

jest.mock('hooks/logs/useActiveLog', () => ({
	useActiveLog: (): any => ({
		onAddToQuery: jest.fn(),
	}),
}));

jest.mock('react-use', () => ({
	useCopyToClipboard: (): any => {
		mockSetCopy = jest.fn();
		return [{ value: null }, mockSetCopy];
	},
}));

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			success: mockNotification,
			error: jest.fn(),
			info: jest.fn(),
			warning: jest.fn(),
			open: jest.fn(),
			destroy: jest.fn(),
		},
	}),
}));

describe('BodyTitleRenderer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should copy primitive value when node is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<BodyTitleRenderer
				title="name"
				nodeKey="user.name"
				value="John"
				parentIsArray={false}
			/>,
		);

		await user.click(screen.getByText('name'));

		await waitFor(() => {
			expect(mockSetCopy).toHaveBeenCalledWith('John');
			expect(mockNotification).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('user.name'),
				}),
			);
		});
	});

	it('should copy array element value when clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<BodyTitleRenderer
				title="0"
				nodeKey="items[*].0"
				value="arrayElement"
				parentIsArray
			/>,
		);

		await user.click(screen.getByText('0'));

		await waitFor(() => {
			expect(mockSetCopy).toHaveBeenCalledWith('arrayElement');
		});
	});

	it('should copy entire object when object node is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const testObject = { id: 123, active: true };

		render(
			<BodyTitleRenderer
				title="metadata"
				nodeKey="user.metadata"
				value={testObject}
				parentIsArray={false}
			/>,
		);

		await user.click(screen.getByText('metadata'));

		await waitFor(() => {
			const callArg = mockSetCopy.mock.calls[0][0];
			const expectedJson = JSON.stringify(testObject, null, 2);
			expect(callArg).toBe(expectedJson);
			expect(mockNotification).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('object copied'),
				}),
			);
		});
	});
});
