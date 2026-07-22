import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import JsonEditorDrawer from '../JsonEditorDrawer';
import { useJsonEditor } from '../useJsonEditor';

jest.mock('../useJsonEditor', () => ({ useJsonEditor: jest.fn() }));

// Editable by default so the drawer renders in its editable (non-read-only) mode.
jest.mock('../../../store/useDashboardStore', () => ({
	useDashboardStore: (
		selector: (s: { isEditable: boolean; editDisabledReason: string }) => unknown,
	): unknown => selector({ isEditable: true, editDisabledReason: '' }),
}));

jest.mock('@monaco-editor/react', () => ({
	__esModule: true,
	default: ({
		value,
		onChange,
	}: {
		value: string;
		onChange: (next?: string) => void;
	}): JSX.Element => (
		<textarea
			aria-label="json-editor"
			data-testid="monaco"
			value={value}
			onChange={(e): void => onChange(e.target.value)}
		/>
	),
}));

jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('react-use', () => ({
	useCopyToClipboard: (): [unknown, jest.Mock] => [{}, jest.fn()],
}));

const mockUseJsonEditor = useJsonEditor as jest.Mock;

const dashboard = {
	id: 'dash-1',
	name: 'My dashboard',
} as unknown as DashboardtypesGettableDashboardV2DTO;

function hookValue(
	overrides: Partial<ReturnType<typeof useJsonEditor>> = {},
): ReturnType<typeof useJsonEditor> {
	return {
		draft: '{\n  "a": 1\n}',
		setDraft: jest.fn(),
		validity: { valid: true, lineCount: 3 },
		isDirty: true,
		isSaving: false,
		danglingPanelIds: [],
		missingPanelRefs: [],
		format: jest.fn(),
		reset: jest.fn(),
		apply: jest.fn().mockResolvedValue(undefined),
		...overrides,
	} as ReturnType<typeof useJsonEditor>;
}

describe('JsonEditorDrawer', () => {
	beforeEach(() => jest.clearAllMocks());

	it('renders the toolbar, editor and footer actions when open', () => {
		mockUseJsonEditor.mockReturnValue(hookValue());
		render(<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />);

		expect(screen.getByTestId('json-editor-format')).toBeInTheDocument();
		expect(screen.getByTestId('json-editor-copy')).toBeInTheDocument();
		expect(screen.getByTestId('json-editor-download')).toBeInTheDocument();
		expect(screen.getByTestId('json-editor-reset')).toBeInTheDocument();
		expect(screen.getByTestId('json-editor-apply')).toBeInTheDocument();
		expect(screen.getByTestId('monaco')).toBeInTheDocument();
	});

	it('shows a valid status with the line count', () => {
		mockUseJsonEditor.mockReturnValue(
			hookValue({ validity: { valid: true, lineCount: 12 } }),
		);
		render(<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />);

		expect(screen.getByTestId('json-editor-validation')).toHaveTextContent(
			'Valid JSON · 12 lines',
		);
	});

	it('warns about dangling panels, and hides the warning when there are none', () => {
		mockUseJsonEditor.mockReturnValue(
			hookValue({ danglingPanelIds: ['p1', 'p2'] }),
		);
		const { rerender } = render(
			<TooltipProvider>
				<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />
			</TooltipProvider>,
		);
		expect(screen.getByTestId('json-editor-dangling-warning')).toHaveTextContent(
			'2 panels not present in layout',
		);

		mockUseJsonEditor.mockReturnValue(hookValue({ danglingPanelIds: [] }));
		rerender(
			<TooltipProvider>
				<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />
			</TooltipProvider>,
		);
		expect(
			screen.queryByTestId('json-editor-dangling-warning'),
		).not.toBeInTheDocument();
	});

	it('warns about layout refs to missing panels', () => {
		mockUseJsonEditor.mockReturnValue(hookValue({ missingPanelRefs: ['ghost'] }));
		render(
			<TooltipProvider>
				<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />
			</TooltipProvider>,
		);
		expect(
			screen.getByTestId('json-editor-missing-ref-warning'),
		).toHaveTextContent('1 layout item references a panel that no longer exists');
	});

	it('shows the error line and message when invalid', () => {
		mockUseJsonEditor.mockReturnValue(
			hookValue({
				validity: {
					valid: false,
					lineCount: 4,
					errorLine: 3,
					message: 'Unexpected token',
				},
			}),
		);
		render(<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />);

		expect(screen.getByTestId('json-editor-validation')).toHaveTextContent(
			'Line 3 · Unexpected token',
		);
	});

	it('disables Apply when not dirty, invalid, or saving', () => {
		mockUseJsonEditor.mockReturnValue(hookValue({ isDirty: false }));
		const { rerender } = render(
			<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />,
		);
		expect(screen.getByTestId('json-editor-apply')).toBeDisabled();

		mockUseJsonEditor.mockReturnValue(
			hookValue({ validity: { valid: false, lineCount: 1 } }),
		);
		rerender(
			<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />,
		);
		expect(screen.getByTestId('json-editor-apply')).toBeDisabled();

		mockUseJsonEditor.mockReturnValue(hookValue({ isSaving: true }));
		rerender(
			<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />,
		);
		expect(screen.getByTestId('json-editor-apply')).toBeDisabled();
	});

	it('wires toolbar and footer buttons to the hook callbacks', () => {
		const value = hookValue();
		mockUseJsonEditor.mockReturnValue(value);
		const onClose = jest.fn();
		render(<JsonEditorDrawer dashboard={dashboard} isOpen onClose={onClose} />);

		fireEvent.click(screen.getByTestId('json-editor-format'));
		expect(value.format).toHaveBeenCalled();

		fireEvent.click(screen.getByTestId('json-editor-reset'));
		expect(value.reset).toHaveBeenCalled();

		fireEvent.click(screen.getByTestId('json-editor-apply'));
		expect(value.apply).toHaveBeenCalled();

		fireEvent.click(screen.getByTestId('json-editor-cancel'));
		expect(onClose).toHaveBeenCalled();
	});

	it('forwards editor changes to setDraft', () => {
		const value = hookValue();
		mockUseJsonEditor.mockReturnValue(value);
		render(<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />);

		fireEvent.change(screen.getByTestId('monaco'), {
			target: { value: '{"b":2}' },
		});
		expect(value.setDraft).toHaveBeenCalledWith('{"b":2}');
	});

	it('applies on Cmd/Ctrl+Enter', () => {
		const value = hookValue();
		mockUseJsonEditor.mockReturnValue(value);
		render(<JsonEditorDrawer dashboard={dashboard} isOpen onClose={jest.fn()} />);

		fireEvent.keyDown(screen.getByTestId('monaco'), {
			key: 'Enter',
			metaKey: true,
		});
		expect(value.apply).toHaveBeenCalled();
	});
});
