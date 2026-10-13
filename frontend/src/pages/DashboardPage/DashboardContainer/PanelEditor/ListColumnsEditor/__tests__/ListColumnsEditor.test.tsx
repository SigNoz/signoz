import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	TelemetrytypesSignalDTO,
	type DashboardtypesPanelSpecDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

import ListColumnsEditor from '../ListColumnsEditor';
import { readSelectFields } from '../selectFields';

// The add-dropdown fetches field-key suggestions; stub the generated hook so the
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

function specWith(
	selectFields: TelemetrytypesTelemetryFieldKeyDTO[] | undefined,
): DashboardtypesPanelSpecDTO {
	return {
		plugin: { kind: 'signoz/ListPanel', spec: { selectFields } },
	} as unknown as DashboardtypesPanelSpecDTO;
}

describe('ListColumnsEditor', () => {
	beforeEach(() => {
		mockUseGetFieldsKeys.mockClear();
		mockUseGetFieldsKeys.mockReturnValue({ data: undefined, isFetching: false });
	});

	it('renders the selected columns as chips', () => {
		render(
			<ListColumnsEditor
				spec={specWith(FIELDS)}
				onChangeSpec={jest.fn()}
				signal={TelemetrytypesSignalDTO.logs}
			/>,
		);

		expect(screen.getByText('body')).toBeInTheDocument();
		expect(screen.getByText('level')).toBeInTheDocument();
	});

	it('shows the empty-state hint when no columns are selected', () => {
		render(
			<ListColumnsEditor
				spec={specWith([])}
				onChangeSpec={jest.fn()}
				signal={TelemetrytypesSignalDTO.logs}
			/>,
		);

		expect(
			screen.getByText(/Leave empty to show all fields/),
		).toBeInTheDocument();
	});

	it('scopes the field-key suggestions to the panel signal', () => {
		render(
			<ListColumnsEditor
				spec={specWith(FIELDS)}
				onChangeSpec={jest.fn()}
				signal={TelemetrytypesSignalDTO.traces}
			/>,
		);

		expect(mockUseGetFieldsKeys).toHaveBeenCalledWith(
			expect.objectContaining({ signal: TelemetrytypesSignalDTO.traces }),
			expect.anything(),
		);
	});

	it('removing a chip writes the spec without that column', async () => {
		const user = userEvent.setup();
		const onChangeSpec = jest.fn();
		render(
			<ListColumnsEditor
				spec={specWith(FIELDS)}
				onChangeSpec={onChangeSpec}
				signal={TelemetrytypesSignalDTO.logs}
			/>,
		);

		await user.click(screen.getByLabelText('Remove body'));

		expect(onChangeSpec).toHaveBeenCalledTimes(1);
		const nextSpec = onChangeSpec.mock.calls[0][0] as DashboardtypesPanelSpecDTO;
		const fields = readSelectFields(nextSpec);
		expect(fields.map((field) => field.name)).toStrictEqual(['level']);
	});

	it('adds a suggestion picked from the dropdown', async () => {
		const user = userEvent.setup();
		mockUseGetFieldsKeys.mockReturnValue({
			data: { data: { keys: { group: [{ name: 'status' }] } } },
			isFetching: false,
		});
		const onChangeSpec = jest.fn();
		render(
			<ListColumnsEditor
				spec={specWith(FIELDS)}
				onChangeSpec={onChangeSpec}
				signal={TelemetrytypesSignalDTO.logs}
			/>,
		);

		await user.click(screen.getByTestId('list-columns-add'));
		const suggestion = await screen.findByText('status');
		await user.click(suggestion);

		expect(onChangeSpec).toHaveBeenCalledTimes(1);
		const nextSpec = onChangeSpec.mock.calls[0][0] as DashboardtypesPanelSpecDTO;
		const fields = readSelectFields(nextSpec);
		expect(fields.map((field) => field.name)).toStrictEqual([
			'body',
			'level',
			'status',
		]);
	});
});
