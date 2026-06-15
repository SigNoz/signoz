import { rest, server } from 'mocks-server/server';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

import KeySearchInput from '../KeySearchInput';
import { FieldContext } from '../types';

const FIELDS_ENDPOINT = '*/api/v1/fields/keys';

const mockKeysResponse = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			'gen_ai.request.model': [
				{ name: 'gen_ai.request.model', fieldContext: 'attribute' },
			],
			'llm.model': [{ name: 'llm.model', fieldContext: 'attribute' }],
		},
	},
};

describe('KeySearchInput', () => {
	let lastRequestParams: Record<string, string | null> = {};

	beforeEach(() => {
		lastRequestParams = {};
		server.use(
			rest.get(FIELDS_ENDPOINT, (req, res, ctx) => {
				lastRequestParams = {
					signal: req.url.searchParams.get('signal'),
					fieldContext: req.url.searchParams.get('fieldContext'),
					searchText: req.url.searchParams.get('searchText'),
				};
				return res(ctx.status(200), ctx.json(mockKeysResponse));
			}),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('does not show suggestions until the input is focused', () => {
		render(
			<KeySearchInput
				value=""
				fieldContext={FieldContext.attribute}
				onChange={jest.fn()}
				testId="key"
			/>,
		);

		expect(screen.queryByTestId('key-dropdown')).not.toBeInTheDocument();
	});

	it('shows suggestions on focus and selecting one calls onChange with the key', async () => {
		const onChange = jest.fn();
		render(
			<KeySearchInput
				value=""
				fieldContext={FieldContext.attribute}
				onChange={onChange}
				testId="key"
			/>,
		);

		fireEvent.focus(screen.getByTestId('key'));

		const option = await screen.findByTestId('key-option-gen_ai.request.model');
		fireEvent.mouseDown(option);

		expect(onChange).toHaveBeenCalledWith('gen_ai.request.model');
	});

	it('queries traces with the resource context when fieldContext is resource', async () => {
		render(
			<KeySearchInput
				value=""
				fieldContext={FieldContext.resource}
				onChange={jest.fn()}
				testId="key"
			/>,
		);

		fireEvent.focus(screen.getByTestId('key'));

		await waitFor(() => expect(lastRequestParams.fieldContext).toBe('resource'));
		expect(lastRequestParams.signal).toBe('traces');
	});

	it('accepts free text typed by the user (custom key)', () => {
		const onChange = jest.fn();
		render(
			<KeySearchInput
				value=""
				fieldContext={FieldContext.attribute}
				onChange={onChange}
				testId="key"
			/>,
		);

		fireEvent.change(screen.getByTestId('key'), {
			target: { value: 'my.custom.key' },
		});

		expect(onChange).toHaveBeenCalledWith('my.custom.key');
	});

	it('does not query while disabled', () => {
		render(
			<KeySearchInput
				value=""
				fieldContext={FieldContext.attribute}
				disabled
				onChange={jest.fn()}
				testId="key"
			/>,
		);

		fireEvent.focus(screen.getByTestId('key'));
		expect(screen.queryByTestId('key-dropdown')).not.toBeInTheDocument();
	});
});
