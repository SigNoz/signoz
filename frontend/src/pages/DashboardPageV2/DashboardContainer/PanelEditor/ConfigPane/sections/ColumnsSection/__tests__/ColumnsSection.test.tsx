import { fireEvent, render, screen } from '@testing-library/react';
import type { TelemetrytypesTelemetryFieldKeyDTO } from 'api/generated/services/sigNoz.schemas';

import ColumnsSection from '../ColumnsSection';

// The column picker fetches field-key suggestions; stub the generated hook so the
// editor renders without a query client. Each test can override the return value.
const mockUseGetFieldsKeys = jest.fn(
	(..._args: unknown[]): { data: unknown; isFetching: boolean } => ({
		data: undefined,
		isFetching: false,
	}),
);
jest.mock('api/generated/services/fields', () => ({
	useGetFieldsKeys: (
		...args: unknown[]
	): { data: unknown; isFetching: boolean } => mockUseGetFieldsKeys(...args),
}));

const FIELDS = [
	{ name: 'body', fieldContext: 'attribute' },
	{ name: 'level' },
] as TelemetrytypesTelemetryFieldKeyDTO[];

describe('ColumnsSection', () => {
	beforeEach(() => {
		mockUseGetFieldsKeys.mockClear();
		mockUseGetFieldsKeys.mockReturnValue({ data: undefined, isFetching: false });
	});

	it('scopes the field-key suggestions query to the panel signal', () => {
		render(
			// @ts-expect-error signal is forwarded by SectionSlot, not in SectionEditorProps
			<ColumnsSection value={undefined} onChange={jest.fn()} signal="logs" />,
		);

		expect(mockUseGetFieldsKeys).toHaveBeenCalledWith(
			expect.objectContaining({ signal: 'logs' }),
			expect.anything(),
		);
	});

	it('renders the empty-state hint when no columns are selected', () => {
		render(<ColumnsSection value={undefined} onChange={jest.fn()} />);

		expect(
			screen.getByText(/Leave empty to show all fields/),
		).toBeInTheDocument();
	});

	it('renders selected fields as tags', () => {
		render(<ColumnsSection value={FIELDS} onChange={jest.fn()} />);

		expect(screen.getByText('body')).toBeInTheDocument();
		expect(screen.getByText('level')).toBeInTheDocument();
	});

	it('removing a tag drops it while preserving the remaining field metadata', () => {
		const onChange = jest.fn();
		const { container } = render(
			<ColumnsSection value={FIELDS} onChange={onChange} />,
		);

		const removeButtons = container.querySelectorAll(
			'.ant-select-selection-item-remove',
		);
		// Remove the second tag ("level"); "body" must survive with its fieldContext.
		fireEvent.click(removeButtons[1]);

		expect(onChange).toHaveBeenCalledWith([
			{ name: 'body', fieldContext: 'attribute' },
		]);
	});
});
