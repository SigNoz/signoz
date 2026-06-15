import { useState } from 'react';
import { rest, server } from 'mocks-server/server';
import { fireEvent, render, screen } from 'tests/test-utils';

import MapperFormDrawer from '../MapperFormDrawer';
import {
	FieldContext,
	MapperDraft,
	MapperDraftMode,
	MapperOperation,
} from '../types';
import { EMPTY_MAPPER_DRAFT } from '../utils';

const FIELDS_ENDPOINT = '*/api/v1/fields/keys';

const filledDraft: MapperDraft = {
	id: null,
	name: 'gen_ai.request.model',
	fieldContext: FieldContext.attribute,
	sources: [
		{
			key: 'llm.model',
			context: FieldContext.attribute,
			operation: MapperOperation.move,
		},
	],
	enabled: true,
};

interface HarnessProps {
	initialDraft?: MapperDraft;
	mode?: MapperDraftMode;
	onSave?: () => void;
	onDelete?: () => void;
}

function Harness({
	initialDraft = EMPTY_MAPPER_DRAFT,
	mode = 'add',
	onSave = jest.fn(),
	onDelete = jest.fn(),
}: HarnessProps): JSX.Element {
	const [draft, setDraft] = useState<MapperDraft>(initialDraft);
	return (
		<MapperFormDrawer
			isOpen
			mode={mode}
			draft={draft}
			setDraft={setDraft}
			onClose={jest.fn()}
			onSave={onSave}
			onDelete={onDelete}
			isSaving={false}
			isDeleting={false}
			saveError={null}
		/>
	);
}

describe('MapperFormDrawer', () => {
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

	it('disables Create when the target/sources are empty', () => {
		render(<Harness />);
		expect(screen.getByTestId('mapper-form-save')).toBeDisabled();
	});

	it('enables Create with a target and a source key, and calls onSave', () => {
		const onSave = jest.fn();
		render(<Harness initialDraft={filledDraft} onSave={onSave} />);

		const save = screen.getByTestId('mapper-form-save');
		expect(save).not.toBeDisabled();

		fireEvent.click(save);
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('adds a source row when "Add another source" is clicked', () => {
		render(<Harness initialDraft={filledDraft} />);

		expect(screen.queryByTestId('mapper-form-source-1')).not.toBeInTheDocument();
		fireEvent.click(screen.getByTestId('mapper-form-add-source'));
		expect(screen.getByTestId('mapper-form-source-1')).toBeInTheDocument();
	});

	it('makes the target read-only in edit mode and shows delete', () => {
		const onDelete = jest.fn();
		render(
			<Harness
				initialDraft={{ ...filledDraft, id: 'local-mapper-1' }}
				mode="edit"
				onDelete={onDelete}
			/>,
		);

		expect(screen.getByTestId('mapper-form-target')).toBeDisabled();

		fireEvent.click(screen.getByTestId('mapper-form-delete'));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});
});
