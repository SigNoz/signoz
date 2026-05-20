import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { screen, waitFor } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import AddKeyModal from '../AddKeyModal';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('react-use', () => ({
	useCopyToClipboard: (): [
		{ value: undefined; error: undefined },
		jest.Mock,
	] => [{ value: undefined, error: undefined }, jest.fn()],
}));

function renderModal(
	searchParams: Record<string, string> = {
		account: 'sa-1',
		'add-key': 'true',
	},
): ReturnType<typeof renderWithNoAuth> {
	return renderWithNoAuth(
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			<AddKeyModal />
		</NuqsTestingAdapter>,
	);
}

describe('AddKeyModal — no-auth mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders no-auth guard on Create Key button when modal is open', async () => {
		renderModal();

		await waitFor(() => {
			expect(screen.getByTestId('no-auth-create-key')).toBeInTheDocument();
		});
	});

	it('does not render no-auth guard when modal is closed', () => {
		renderModal({ account: 'sa-1' });

		expect(screen.queryByTestId('no-auth-create-key')).not.toBeInTheDocument();
	});
});
