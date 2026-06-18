import { useState } from 'react';
import { rest, server } from 'mocks-server/server';
import { fireEvent, render, screen } from 'tests/test-utils';

import ConditionKeyList from '../ConditionKeyList';
import { FieldContext } from '../types';

const FIELDS_ENDPOINT = '*/api/v1/fields/keys';

function Harness({ initial = [] as string[] }): JSX.Element {
	const [keys, setKeys] = useState<string[]>(initial);
	return (
		<ConditionKeyList
			label="Attributes"
			keys={keys}
			placeholder="key"
			addLabel="Add attribute key"
			testIdPrefix="cond"
			fieldContext={FieldContext.attribute}
			onChange={setKeys}
		/>
	);
}

describe('ConditionKeyList', () => {
	beforeEach(() => {
		server.use(
			rest.get(FIELDS_ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ status: 'success', data: { complete: true, keys: {} } }),
				),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders no key rows and only the add button when empty', () => {
		render(<Harness />);
		expect(screen.queryByTestId('cond-0')).not.toBeInTheDocument();
		expect(screen.getByTestId('cond-add')).toBeInTheDocument();
	});

	it('adds a key row when the add button is clicked', () => {
		render(<Harness />);
		fireEvent.click(screen.getByTestId('cond-add'));
		expect(screen.getByTestId('cond-0')).toBeInTheDocument();
	});

	it('removes a key row when its remove button is clicked', () => {
		render(<Harness initial={['gen_ai.', 'llm.']} />);

		expect(screen.getByTestId('cond-0')).toBeInTheDocument();
		expect(screen.getByTestId('cond-1')).toBeInTheDocument();

		fireEvent.click(screen.getByTestId('cond-remove-1'));

		expect(screen.queryByTestId('cond-1')).not.toBeInTheDocument();
		expect(screen.getByTestId('cond-0')).toBeInTheDocument();
	});
});
