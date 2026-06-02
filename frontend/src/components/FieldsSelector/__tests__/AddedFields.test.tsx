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

	it('hides the Remove button for fields whose composite key is in requiredFields', () => {
		const fields = [makeField('a'), makeField('b'), makeField('c')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['log.a', 'log.c']}
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
				requiredFields={['log.a']}
			/>,
		);

		expect(screen.getByText('a')).toBeInTheDocument();
		expect(screen.getByText('b')).toBeInTheDocument();
	});

	it('locks ONLY the canonical variant — a same-name field from another context stays removable', () => {
		// Two `body` fields with different contexts. requiredFields holds the
		// canonical composite key only, so the attribute variant is deletable.
		const fields = [makeField('body', 'log'), makeField('body', 'attribute')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['log.body']}
			/>,
		);

		// One Remove button: the attribute variant. log variant is locked.
		expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
	});

	it('does not lock anything when a bare name is passed (composite key required)', () => {
		// Bare `body` no longer matches — matching is composite-key only now.
		const fields = [makeField('body', 'log'), makeField('body', 'attribute')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['body']}
			/>,
		);

		// Neither variant locked → both removable.
		expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(2);
	});

	it('treats requiredFields as exact composite-key match (substring does not lock)', () => {
		const fields = [makeField('body'), makeField('body_extra')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['log.body']}
			/>,
		);

		// 'log.body' locked, 'log.body_extra' removable.
		expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
	});
});
