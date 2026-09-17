import type { Mock } from 'vitest';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from 'tests/test-utils';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';

import Header from '../Header';

vi.mock('hooks/useIsAIAssistantEnabled', () => ({
	useIsAIAssistantEnabled: vi.fn(),
}));

vi.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: (): unknown => ({
		isCloudUser: true,
		isEnterpriseSelfHostedUser: false,
	}),
}));

vi.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: vi.fn(),
}));

const mockUseIsAIAssistantEnabled = useIsAIAssistantEnabled as Mock;

function renderHeader(
	props: Partial<ComponentProps<typeof Header>> = {},
): void {
	// AppLayout supplies the TooltipProvider in the app; the header is rendered bare here.
	render(
		<MemoryRouter>
			<TooltipProvider>
				<Header
					isDirty={false}
					isSaving={false}
					onSave={vi.fn()}
					onClose={vi.fn()}
					{...props}
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

	it('keeps Save enabled even when there are no unsaved edits', () => {
		mockUseIsAIAssistantEnabled.mockReturnValue(false);

		renderHeader({ isDirty: false });

		expect(screen.getByTestId('panel-editor-v2-save')).toBeEnabled();
	});

	it('disables Save only while read-only or saving', () => {
		mockUseIsAIAssistantEnabled.mockReturnValue(false);

		renderHeader({
			isDirty: true,
			readOnly: true,
			readOnlyTooltip: 'Locked',
		});

		expect(screen.getByTestId('panel-editor-v2-save')).toBeDisabled();
	});

	it('shows the Unsaved Changes badge only when there are unsaved edits', () => {
		mockUseIsAIAssistantEnabled.mockReturnValue(false);

		renderHeader({ isDirty: false });
		expect(
			screen.queryByTestId('panel-editor-v2-unsaved-badge'),
		).not.toBeInTheDocument();

		renderHeader({ isDirty: true });
		expect(
			screen.getByTestId('panel-editor-v2-unsaved-badge'),
		).toBeInTheDocument();
	});
});
