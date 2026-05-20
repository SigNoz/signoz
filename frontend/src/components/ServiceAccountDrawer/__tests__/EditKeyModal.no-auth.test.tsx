import type { ServiceaccounttypesGettableFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { screen, waitFor } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import EditKeyModal from '../EditKeyModal';

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

const mockKey: ServiceaccounttypesGettableFactorAPIKeyDTO = {
	id: 'key-1',
	name: 'Test Key',
	expiresAt: 0,
	lastObservedAt: null as unknown as string,
	serviceAccountId: 'sa-1',
};

function renderModal(
	keyItem: ServiceaccounttypesGettableFactorAPIKeyDTO | null = mockKey,
	searchParams: Record<string, string> = {
		account: 'sa-1',
		'edit-key': 'key-1',
	},
): ReturnType<typeof renderWithNoAuth> {
	return renderWithNoAuth(
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			<EditKeyModal keyItem={keyItem} />
		</NuqsTestingAdapter>,
	);
}

describe('EditKeyModal — no-auth mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders no-auth guards on Revoke Key and Save Changes buttons', async () => {
		renderModal();

		await waitFor(() => {
			expect(screen.getByTestId('no-auth-revoke-key')).toBeInTheDocument();
			expect(screen.getByTestId('no-auth-save-key')).toBeInTheDocument();
		});
	});

	it('does not render no-auth guards when modal is closed', () => {
		renderModal(null, { account: 'sa-1' });

		expect(screen.queryByTestId('no-auth-revoke-key')).not.toBeInTheDocument();
		expect(screen.queryByTestId('no-auth-save-key')).not.toBeInTheDocument();
	});
});
