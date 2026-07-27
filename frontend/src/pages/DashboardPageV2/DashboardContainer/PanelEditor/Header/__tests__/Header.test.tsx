import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';

import Header from '../Header';

jest.mock('hooks/useIsAIAssistantEnabled', () => ({
	useIsAIAssistantEnabled: jest.fn(),
}));

jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: (): unknown => ({
		isCloudUser: true,
		isEnterpriseSelfHostedUser: false,
	}),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockUseIsAIAssistantEnabled = useIsAIAssistantEnabled as jest.Mock;

function renderHeader(): void {
	// AppLayout supplies the TooltipProvider in the app; the header is rendered bare here.
	render(
		<MemoryRouter>
			<TooltipProvider>
				<Header
					isDirty={false}
					isSaving={false}
					onSave={jest.fn()}
					onClose={jest.fn()}
				/>
			</TooltipProvider>
		</MemoryRouter>,
	);
}

describe('PanelEditor Header', () => {
	afterEach(() => {
		mockUseIsAIAssistantEnabled.mockReset();
	});

	// The editor is a full page, so the side nav's Noz entry point is gone while it is
	// open — the header has to offer it instead.
	it('offers Noz alongside the editor actions', () => {
		mockUseIsAIAssistantEnabled.mockReturnValue(true);

		renderHeader();

		expect(screen.getByRole('button', { name: 'Open Noz' })).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-save')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-close')).toBeInTheDocument();
	});

	it('omits Noz when the AI assistant is disabled', () => {
		mockUseIsAIAssistantEnabled.mockReturnValue(false);

		renderHeader();

		expect(
			screen.queryByRole('button', { name: 'Open Noz' }),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-save')).toBeInTheDocument();
	});
});
