import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TagKeyValueInput from './TagKeyValueInput';

const TID = 'tag-key-value-input';

type User = ReturnType<typeof userEvent.setup>;

const startEditingFirstChip = async (user: User): Promise<HTMLElement> => {
	await user.dblClick(screen.getAllByTestId(`${TID}-chip`)[0]);
	return screen.getByTestId(`${TID}-edit`);
};

describe('TagKeyValueInput — inline chip edit', () => {
	it('shows an error and stays in edit mode when Enter commits an invalid value', async () => {
		const user = userEvent.setup();
		const onTagsChange = jest.fn();
		render(<TagKeyValueInput tags={['env:prod']} onTagsChange={onTagsChange} />);

		const input = await startEditingFirstChip(user);
		await user.clear(input);
		await user.type(input, 'novalue{Enter}');

		expect(screen.getByTestId(`${TID}-error`)).toHaveTextContent(
			'key:value format',
		);
		// Still editing (input present), and no change committed.
		expect(screen.getByTestId(`${TID}-edit`)).toBeInTheDocument();
		expect(onTagsChange).not.toHaveBeenCalled();
	});

	it('shows a duplicate error when Enter commits an existing tag', async () => {
		const user = userEvent.setup();
		const onTagsChange = jest.fn();
		render(
			<TagKeyValueInput
				tags={['env:prod', 'team:pulse']}
				onTagsChange={onTagsChange}
			/>,
		);

		const input = await startEditingFirstChip(user);
		await user.clear(input);
		await user.type(input, 'team:pulse{Enter}');

		expect(screen.getByTestId(`${TID}-error`)).toHaveTextContent(
			'already exists',
		);
		expect(onTagsChange).not.toHaveBeenCalled();
	});

	it('commits a valid edit on Enter', async () => {
		const user = userEvent.setup();
		const onTagsChange = jest.fn();
		render(<TagKeyValueInput tags={['env:prod']} onTagsChange={onTagsChange} />);

		const input = await startEditingFirstChip(user);
		await user.clear(input);
		await user.type(input, 'env:staging{Enter}');

		expect(onTagsChange).toHaveBeenCalledWith(['env:staging']);
		expect(screen.queryByTestId(`${TID}-error`)).not.toBeInTheDocument();
	});

	it('reverts silently (no error) when blurring an invalid edit', async () => {
		const user = userEvent.setup();
		const onTagsChange = jest.fn();
		render(<TagKeyValueInput tags={['env:prod']} onTagsChange={onTagsChange} />);

		const input = await startEditingFirstChip(user);
		await user.clear(input);
		await user.type(input, 'novalue');
		await user.tab(); // blur off the edit input

		expect(screen.queryByTestId(`${TID}-error`)).not.toBeInTheDocument();
		expect(screen.queryByTestId(`${TID}-edit`)).not.toBeInTheDocument();
		expect(onTagsChange).not.toHaveBeenCalled();
	});
});

describe('TagKeyValueInput — backend-rule validation', () => {
	it('rejects a key containing a space on inline edit', async () => {
		const user = userEvent.setup();
		const onTagsChange = jest.fn();
		render(<TagKeyValueInput tags={['env:prod']} onTagsChange={onTagsChange} />);

		const input = await startEditingFirstChip(user);
		await user.clear(input);
		await user.type(input, 'my key:prod{Enter}');

		expect(screen.getByTestId(`${TID}-error`)).toHaveTextContent(
			'spaces or special characters',
		);
		expect(screen.getByTestId(`${TID}-edit`)).toBeInTheDocument();
		expect(onTagsChange).not.toHaveBeenCalled();
	});

	it('rejects a value containing a space in the new-tag input', async () => {
		const user = userEvent.setup();
		const onTagsChange = jest.fn();
		render(<TagKeyValueInput tags={[]} onTagsChange={onTagsChange} />);

		const input = screen.getByTestId(TID);
		await user.type(input, 'env:pro d{Enter}');

		expect(screen.getByTestId(`${TID}-error`)).toHaveTextContent(
			'spaces or special characters',
		);
		expect(onTagsChange).not.toHaveBeenCalled();
	});
});
