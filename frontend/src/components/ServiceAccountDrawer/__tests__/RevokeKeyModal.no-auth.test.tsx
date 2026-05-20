import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { screen, waitFor } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import RevokeKeyModal from '../RevokeKeyModal';

jest.mock('components/AuthZTooltip/AuthZTooltip', () => ({
	__esModule: true,
	default: ({
		children,
	}: {
		children: React.ReactElement;
	}): React.ReactElement => children,
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

function renderModal(
	searchParams: Record<string, string> = {
		account: 'sa-1',
		'revoke-key': 'key-1',
	},
): ReturnType<typeof renderWithNoAuth> {
	return renderWithNoAuth(
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			<RevokeKeyModal />
		</NuqsTestingAdapter>,
	);
}

describe('RevokeKeyModal — no-auth mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders no-auth guard on confirm Revoke Key button when modal is open', async () => {
		renderModal();

		await waitFor(() => {
			expect(screen.getByTestId('no-auth-confirm-revoke')).toBeInTheDocument();
		});
	});

	it('does not render no-auth guard when modal is closed', () => {
		renderModal({ account: 'sa-1' });

		expect(
			screen.queryByTestId('no-auth-confirm-revoke'),
		).not.toBeInTheDocument();
	});
});
