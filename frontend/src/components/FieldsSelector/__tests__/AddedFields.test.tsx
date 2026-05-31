import { render, screen } from 'tests/test-utils';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import AddedFields from '../AddedFields';

const makeField = (name: string): TelemetryFieldKey => ({
	name,
	signal: 'logs',
	fieldContext: 'log',
	fieldDataType: 'string',
});

describe('AddedFields — requiredFields', () => {
	it('renders a Remove button for every field when no requiredFields are passed', () => {
		const fields = [makeField('a'), makeField('b'), makeField('c')];

		render(
			<AddedFields inputValue="" fields={fields} onFieldsChange={jest.fn()} />,
		);

		expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(3);
	});

	it('hides the Remove button for fields listed in requiredFields', () => {
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

	it('still renders the field name + drag handle for required fields', () => {
		const fields = [makeField('a'), makeField('b')];

		render(
			<AddedFields
				inputValue=""
				fields={fields}
				onFieldsChange={jest.fn()}
				requiredFields={['a']}
			/>,
		);

		// Both names visible regardless of required status.
		expect(screen.getByText('a')).toBeInTheDocument();
		expect(screen.getByText('b')).toBeInTheDocument();
	});

	it('treats requiredFields as an exact-name match (substring matches do not lock)', () => {
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
});
