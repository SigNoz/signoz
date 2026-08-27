import { act, fireEvent, render, screen } from 'tests/test-utils';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import FieldsSelector from '../FieldsSelector';
import { useSelectableFields } from 'hooks/querySuggestions/useSelectableFields';

jest.mock('hooks/querySuggestions/useSelectableFields', () => ({
	useSelectableFields: jest.fn(() => ({
		data: undefined,
		isFetching: false,
		isFetched: true,
	})),
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

// FloatingPanel is a react-rnd/portal shell — presentation only. Render its
// children directly so the test exercises the column-editing behavior.
jest.mock('periscope/components/FloatingPanel', () => ({
	FloatingPanel: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

const mockSuggestions = (names: string[]): void => {
	(useSelectableFields as jest.Mock).mockReturnValue({
		data: {
			data: {
				data: {
					keys: {
						attributeKeys: names.map((name) => ({
							name,
							signal: 'logs',
							fieldDataType: 'string',
							fieldContext: '',
						})),
					},
				},
			},
		},
		isFetching: false,
		isFetched: true,
	});
};

const field = (name: string, fieldContext = 'log'): TelemetryFieldKey => ({
	name,
	signal: 'logs',
	fieldContext: fieldContext as TelemetryFieldKey['fieldContext'],
	fieldDataType: 'string',
});

const renderPanel = (
	props: Partial<React.ComponentProps<typeof FieldsSelector>> = {},
): { onFieldsChange: jest.Mock } => {
	const onFieldsChange = jest.fn();
	render(
		<FieldsSelector
			isOpen
			title="Edit columns"
			fields={props.fields ?? []}
			onFieldsChange={onFieldsChange}
			onClose={jest.fn()}
			signal={DataSource.LOGS}
			allowCustomFields
			{...props}
		/>,
	);
	return { onFieldsChange };
};

// Type into the search box and flush the 400ms debounce so OtherFields (driven
// by the debounced value) recomputes.
const typeSearch = (value: string): void => {
	const input = screen.getByPlaceholderText('Search for a field...');
	act(() => {
		fireEvent.change(input, { target: { value } });
	});
	act(() => {
		jest.advanceTimersByTime(400);
	});
};

describe('FieldsSelector — edit columns (integration)', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockSuggestions([]);
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('adds a free-typed field end to end and saves the synthesized key', () => {
		const { onFieldsChange } = renderPanel({ fields: [field('body')] });

		typeSearch('orderId');

		// custom option surfaces in OTHER FIELDS (only Add button, no suggestions)
		expect(screen.getByText('orderId')).toBeInTheDocument();

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
		});

		// moved into ADDED FIELDS → OTHER FIELDS has nothing left to offer
		expect(screen.getByText('No values found')).toBeInTheDocument();

		// Save commits the draft
		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
		});

		expect(onFieldsChange).toHaveBeenCalledTimes(1);
		const saved = onFieldsChange.mock.calls[0][0] as TelemetryFieldKey[];
		expect(saved).toStrictEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'orderId',
					fieldContext: '',
					fieldDataType: '',
					key: 'orderId',
				}),
			]),
		);
	});

	it('adds a suggested field: it moves from OTHER FIELDS into ADDED FIELDS', () => {
		mockSuggestions(['service.name']);
		const { onFieldsChange } = renderPanel({ fields: [] });

		const addButton = screen.getByRole('button', { name: /^add$/i });
		act(() => {
			fireEvent.click(addButton);
		});

		// now removable in ADDED FIELDS, no longer offered in OTHER FIELDS
		expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /^add$/i }),
		).not.toBeInTheDocument();

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
		});
		const saved = onFieldsChange.mock.calls[0][0] as TelemetryFieldKey[];
		expect(saved.map((f) => f.name)).toContain('service.name');
	});

	it('hides the custom option when the typed name is already added', () => {
		renderPanel({ fields: [field('orderId')] });

		typeSearch('ORDERID');

		// exact name already added → nothing left to offer in OTHER FIELDS
		expect(screen.queryByText('ORDERID')).not.toBeInTheDocument();
		expect(screen.getByText('No values found')).toBeInTheDocument();
	});

	it('does not offer a custom option when allowCustomFields is off', () => {
		renderPanel({ fields: [], allowCustomFields: false });

		typeSearch('unknown.a.b.c');

		// no custom row and nothing addable
		expect(screen.queryByText('unknown.a.b.c')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /^add$/i }),
		).not.toBeInTheDocument();
	});

	it('discards an added field, reverting the draft', () => {
		const { onFieldsChange } = renderPanel({ fields: [field('body')] });

		typeSearch('orderId');
		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
		});

		// clear the search so the added list is not filtered
		typeSearch('');

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /discard/i }));
		});

		expect(screen.queryByText('orderId')).not.toBeInTheDocument();
		expect(onFieldsChange).not.toHaveBeenCalled();
	});
});
