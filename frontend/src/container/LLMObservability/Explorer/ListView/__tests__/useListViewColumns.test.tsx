import { toast } from '@signozhq/ui/sonner';
import { TelemetryFieldKey } from 'api/v5/v5';
import ROUTES from 'constants/routes';
import { render, screen, userEvent } from 'tests/test-utils';

import { getFieldColumn } from '../../TracesTable/getFieldColumn';
import { defaultSelectedColumns } from '../configs';
import { LAST_COLUMN_ERROR, useListViewColumns } from '../useListViewColumns';

jest.mock('@signozhq/ui/sonner', () => ({
	toast: { error: jest.fn(), success: jest.fn() },
}));

const [SERVICE_NAME, SPAN_NAME, DURATION] = defaultSelectedColumns;
const MODEL = {
	name: 'gen_ai.request.model',
	signal: 'traces',
	fieldContext: 'attribute',
	fieldDataType: 'string',
} as TelemetryFieldKey;

function Harness(): JSX.Element {
	const {
		selectedFields,
		fieldsSelectorConfig,
		onColumnOrderChange,
		onColumnRemove,
	} = useListViewColumns();
	const removeFirst = (): void =>
		onColumnRemove(getFieldColumn(selectedFields[0]).id);

	return (
		<div>
			<div data-testid="columns">
				{selectedFields.map((field) => field.name).join(',')}
			</div>
			<button
				type="button"
				onClick={(): void =>
					fieldsSelectorConfig.fieldsSelector?.onFieldsChange([SPAN_NAME, MODEL])
				}
			>
				save drawer
			</button>
			<button
				type="button"
				onClick={(): void =>
					onColumnOrderChange(
						[DURATION, SERVICE_NAME, SPAN_NAME].map((field) => getFieldColumn(field)),
					)
				}
			>
				reorder
			</button>
			<button type="button" onClick={removeFirst}>
				remove first
			</button>
		</div>
	);
}

const renderHarness = (): void => {
	render(<Harness />, undefined, {
		initialRoute: ROUTES.AI_OBSERVABILITY_EXPLORER,
	});
};

describe('useListViewColumns', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('falls back to the default columns when nothing is stored', () => {
		renderHarness();

		expect(screen.getByTestId('columns')).toHaveTextContent(
			defaultSelectedColumns.map((field) => field.name).join(','),
		);
	});

	it('saves the drawer selection', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();

		await user.click(screen.getByRole('button', { name: 'save drawer' }));

		expect(screen.getByTestId('columns')).toHaveTextContent(
			'name,gen_ai.request.model',
		);
	});

	it('follows the table order on a header drag, keeping unlisted columns last', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();

		await user.click(screen.getByRole('button', { name: 'reorder' }));

		expect(screen.getByTestId('columns')).toHaveTextContent(
			/^duration_nano,service\.name,name,/,
		);
	});

	it('removes a column from the header but never the last one', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderHarness();
		await user.click(screen.getByRole('button', { name: 'save drawer' }));

		await user.click(screen.getByRole('button', { name: 'remove first' }));
		expect(screen.getByTestId('columns')).toHaveTextContent(
			/^gen_ai\.request\.model$/,
		);

		await user.click(screen.getByRole('button', { name: 'remove first' }));
		expect(screen.getByTestId('columns')).toHaveTextContent(
			/^gen_ai\.request\.model$/,
		);
		expect(jest.mocked(toast.error)).toHaveBeenCalledWith(LAST_COLUMN_ERROR);
	});
});
