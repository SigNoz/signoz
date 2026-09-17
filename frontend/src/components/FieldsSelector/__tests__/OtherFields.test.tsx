import { fireEvent, render, screen } from 'tests/test-utils';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { FieldKeysConfigProp } from 'api/querySuggestions/types';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DATA_SOURCE_TO_SIGNAL, DataSource } from 'types/common/queryBuilder';

import OtherFields from '../OtherFields';
import type { Mock } from 'vitest';

vi.mock('hooks/querySuggestions/useFieldKeysSuggestion', () => ({
	useFieldKeysSuggestion: vi.fn(() => ({
		data: undefined,
		isFetching: false,
		isFetched: true,
	})),
}));

const mockSuggestions = (names: string[]): void => {
	(useFieldKeysSuggestion as Mock).mockReturnValue({
		data: names.map((name) => ({
			name,
			signal: 'logs',
			fieldDataType: 'string',
			fieldContext: '',
		})),
		isFetching: false,
		isFetched: true,
	});
};

const renderOtherFields = (
	props: Partial<React.ComponentProps<typeof OtherFields>> = {},
): { onAdd: Mock } => {
	const onAdd = vi.fn();
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

		expect(screen.getByText('unknown.a.b.c')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /add/i }),
		).not.toBeInTheDocument();
	});
});

describe('OtherFields — field keys config', () => {
	const pool: TelemetryFieldKey[] = [
		{ name: 'total_tokens', fieldContext: 'trace', fieldDataType: 'float64' },
		{ name: 'llm_call_count', fieldContext: 'trace', fieldDataType: 'float64' },
	];

	const fieldKeysConfig: FieldKeysConfigProp = {
		fieldContext: TelemetrytypesFieldContextDTO.trace,
	};
	const builderQueryType: BuilderQueryType = 'builder_ai_query';

	const mockPool = (fields: TelemetryFieldKey[]): void => {
		(useFieldKeysSuggestion as Mock).mockReturnValue({
			data: fields,
			isFetching: false,
			isFetched: true,
		});
	};

	beforeEach(() => {
		mockPool(pool);
	});

	it('lists the pool it is handed', () => {
		renderOtherFields({
			fieldKeysConfig,
			builderQueryType,
			allowCustomFields: false,
		});

		expect(screen.getByText('total_tokens')).toBeInTheDocument();
		expect(screen.getByText('llm_call_count')).toBeInTheDocument();
	});

	it('forwards the fetch params and search to the shared keys hook', () => {
		renderOtherFields({
			fieldKeysConfig,
			builderQueryType,
			allowCustomFields: false,
			debouncedInputValue: 'llm',
		});

		expect(useFieldKeysSuggestion).toHaveBeenCalledWith(
			{
				...fieldKeysConfig,
				signal: DATA_SOURCE_TO_SIGNAL[DataSource.LOGS],
				searchText: 'llm',
			},
			builderQueryType,
		);
	});

	it('lists extra fields the keys endpoint never returns', () => {
		mockPool([{ name: 'total_tokens' } as TelemetryFieldKey]);

		renderOtherFields({
			fieldKeysConfig,
			builderQueryType,
			extraFields: [{ name: 'last_activity_time' } as TelemetryFieldKey],
			allowCustomFields: false,
		});

		expect(screen.getByText('last_activity_time')).toBeInTheDocument();
		expect(screen.getByText('total_tokens')).toBeInTheDocument();
	});

	it('filters extra fields by search text', () => {
		mockPool([]);

		renderOtherFields({
			fieldKeysConfig,
			builderQueryType,
			extraFields: [
				{ name: 'last_activity_time' } as TelemetryFieldKey,
				{ name: 'timestamp' } as TelemetryFieldKey,
			],
			debouncedInputValue: 'activity',
			allowCustomFields: false,
		});

		expect(screen.getByText('last_activity_time')).toBeInTheDocument();
		expect(screen.queryByText('timestamp')).not.toBeInTheDocument();
	});

	it('keeps a fetched key whose name does not contain the search text', () => {
		mockPool([
			{ name: 'service.name', fieldContext: 'resource' } as TelemetryFieldKey,
		]);

		renderOtherFields({
			debouncedInputValue: 'resource.service',
			allowCustomFields: false,
		});

		expect(screen.getByText('service.name')).toBeInTheDocument();
	});

	it('omits pool fields that are already added', () => {
		renderOtherFields({
			fieldKeysConfig,
			builderQueryType,
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
