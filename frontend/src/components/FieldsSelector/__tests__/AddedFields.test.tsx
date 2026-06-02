import { render, screen } from 'tests/test-utils';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import AddedFields from '../AddedFields';

// AddedFields assumes the caller has populated `key` (the parent
// FieldsSelector does this via its normalization useMemo). Tests pre-populate
// it directly.
const makeField = (name: string, fieldContext = 'log'): TelemetryFieldKey => ({
	name,
	signal: 'logs',
	fieldContext: fieldContext as TelemetryFieldKey['fieldContext'],
	fieldDataType: 'string',
	key: `${fieldContext}.${name}`,
});

describe('AddedFields — requiredFields', () => {
	it('renders a Remove button for every field when no requiredFields are passed', () => {
		const fields = [makeField('a'), makeField('b'), makeField('c')];

		render(
			<AddedFields inputValue="" fields={fields} onFieldsChange={jest.fn()} />,
		);

		expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(3);
	});

	it('hides the Remove button for fields whose name is in requiredFields', () => {
		const fields = [makeField('a'), makeField('b'), makeField('c')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['a', 'c']}
			/>,
		);

		// Only 'b' is removable.
		const removeButtons = screen.getAllByRole('button', { name: /remove/i });
		expect(removeButtons).toHaveLength(1);
	});

	it('still renders the field name for required fields', () => {
		const fields = [makeField('a'), makeField('b')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['a']}
			/>,
		);

		expect(screen.getByText('a')).toBeInTheDocument();
		expect(screen.getByText('b')).toBeInTheDocument();
	});

	it('locks all variants of a required name regardless of fieldContext', () => {
		// Two `body` fields with different contexts — both should lock when
		// `body` is in requiredFields.
		const fields = [makeField('body', 'log'), makeField('body', 'attribute')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['body']}
			/>,
		);

		// Both 'body' variants locked → zero Remove buttons.
		expect(screen.queryAllByRole('button', { name: /remove/i })).toHaveLength(0);
	});

	it('treats requiredFields as exact-name match (substring does not lock)', () => {
		const fields = [makeField('body'), makeField('body_extra')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['body']}
			/>,
		);

		// 'body' locked, 'body_extra' removable.
		expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
	});

	it('also accepts composite IDs in requiredFields (locks a specific variant)', () => {
		// Two `body` fields with different contexts.
		const fields = [makeField('body', 'log'), makeField('body', 'attribute')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				// Composite ID — locks ONLY the log variant, attribute variant stays
				// removable.
				requiredFields={['log.body']}
			/>,
		);

		// One Remove button: the attribute variant. log variant is locked.
		expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
	});
});
