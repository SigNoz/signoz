import { fireEvent, render, screen } from 'tests/test-utils';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import OtherFields from '../OtherFields';
import { useSelectableFields } from '../useSelectableFields';

jest.mock('../useSelectableFields', () => ({
	useSelectableFields: jest.fn(() => ({ fields: [], isLoading: false })),
}));

const mockSuggestions = (names: string[]): void => {
	(useSelectableFields as jest.Mock).mockReturnValue({
		fields: names.map((name) => ({
			name,
			signal: 'logs',
			fieldDataType: 'string',
			fieldContext: '',
		})),
		isLoading: false,
	});
};

const renderOtherFields = (
	props: Partial<React.ComponentProps<typeof OtherFields>> = {},
): { onAdd: jest.Mock } => {
	const onAdd = jest.fn();
	render(
		<OtherFields
			signal={DataSource.LOGS}
			debouncedInputValue=""
			addedFields={[]}
			onAdd={onAdd}
			isAtLimit={false}
			allowCustomFields
			{...props}
		/>,
	);
	return { onAdd };
};

const addedField = (name: string): TelemetryFieldKey => ({
	name,
	signal: 'logs',
	fieldContext: '',
	fieldDataType: '',
	key: name,
});

describe('OtherFields — custom (free-typed) option', () => {
	beforeEach(() => {
		mockSuggestions([]);
	});

	it('shows a custom option for a typed name that is not a suggestion', () => {
		renderOtherFields({ debouncedInputValue: 'unknown.a.b.c' });

		expect(screen.getByText('unknown.a.b.c')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
	});

	it('synthesizes the field with raw name, empty context/type, on add', () => {
		const { onAdd } = renderOtherFields({ debouncedInputValue: 'orderId' });

		fireEvent.click(screen.getByRole('button', { name: /add/i }));

		expect(onAdd).toHaveBeenCalledWith({
			name: 'orderId',
			fieldContext: '',
			fieldDataType: '',
			key: 'orderId',
		});
	});

	it('hides the custom option when an exact suggestion exists (case-insensitive)', () => {
		mockSuggestions(['orderId']);
		renderOtherFields({ debouncedInputValue: 'orderid' });

		// the real suggestion shows, the lowercased custom name does not
		expect(screen.getByText('orderId')).toBeInTheDocument();
		expect(screen.queryByText('orderid')).not.toBeInTheDocument();
	});

	it('hides the custom option when the name is already added (case-insensitive)', () => {
		renderOtherFields({
			debouncedInputValue: 'ORDERID',
			addedFields: [addedField('orderId')],
		});

		expect(screen.queryByText('ORDERID')).not.toBeInTheDocument();
		expect(screen.getByText('No values found')).toBeInTheDocument();
	});

	it('does not show the custom option when allowCustomFields is off', () => {
		renderOtherFields({
			debouncedInputValue: 'unknown.a.b.c',
			allowCustomFields: false,
		});

		expect(screen.queryByText('unknown.a.b.c')).not.toBeInTheDocument();
		expect(screen.getByText('No values found')).toBeInTheDocument();
	});

	it('does not show the custom option for an empty input', () => {
		renderOtherFields({ debouncedInputValue: '   ' });

		expect(screen.getByText('No values found')).toBeInTheDocument();
	});

	it('shows the custom option at the field limit but hides its Add button', () => {
		renderOtherFields({ debouncedInputValue: 'unknown.a.b.c', isAtLimit: true });

		// same as every other row at the limit: name shown, no Add button
		expect(screen.getByText('unknown.a.b.c')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /add/i }),
		).not.toBeInTheDocument();
	});
});
describe('OtherFields — addStaticFields (named pool)', () => {
	const pool: TelemetryFieldKey[] = [
		{ name: 'total_tokens', fieldContext: 'trace', fieldDataType: 'float64' },
		{ name: 'llm_call_count', fieldContext: 'trace', fieldDataType: 'float64' },
	];

	beforeEach(() => {
		mockSuggestions(['ingested.field']);
		(useSelectableFields as jest.Mock).mockReturnValue({
			fields: pool,
			isLoading: false,
		});
	});

	it('lists the pool and never reads the suggestions endpoint', () => {
		renderOtherFields({ addStaticFields: 'ai_o11y', allowCustomFields: false });

		expect(screen.getByText('total_tokens')).toBeInTheDocument();
		expect(screen.getByText('llm_call_count')).toBeInTheDocument();
		expect(screen.queryByText('ingested.field')).not.toBeInTheDocument();
		expect(useSelectableFields).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'ai_o11y' }),
		);
	});

	it('filters the pool client-side on the search input', () => {
		renderOtherFields({
			addStaticFields: 'ai_o11y',
			allowCustomFields: false,
			debouncedInputValue: 'llm',
		});

		expect(screen.getByText('llm_call_count')).toBeInTheDocument();
		expect(screen.queryByText('total_tokens')).not.toBeInTheDocument();
	});

	it('omits pool fields that are already added', () => {
		renderOtherFields({
			addStaticFields: 'ai_o11y',
			allowCustomFields: false,
			addedFields: [
				{
					name: 'total_tokens',
					fieldContext: 'trace',
					fieldDataType: 'float64',
					key: 'trace:total_tokens:float64',
				},
			],
		});

		expect(screen.queryByText('total_tokens')).not.toBeInTheDocument();
		expect(screen.getByText('llm_call_count')).toBeInTheDocument();
	});
});
