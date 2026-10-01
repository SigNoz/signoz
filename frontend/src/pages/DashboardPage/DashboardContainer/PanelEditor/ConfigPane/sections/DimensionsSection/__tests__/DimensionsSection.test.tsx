import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DimensionsSection from '../DimensionsSection';

const TABLE_COLUMNS = [
	{ key: 'A.count()', label: 'count()' },
	{ key: 'A.p99(duration_nano)', label: 'p99(duration_nano)' },
];

async function pick(dimension: string, label: string): Promise<void> {
	const user = userEvent.setup();
	const trigger = screen.getByTestId(`panel-editor-v2-dimension-${dimension}`);
	await user.click(trigger.querySelector('.ant-select-selector') as HTMLElement);
	await user.click(await screen.findByRole('option', { name: label }));
}

describe('DimensionsSection', () => {
	it('shows each unset dimension as its default', () => {
		render(
			<DimensionsSection
				value={undefined}
				onChange={jest.fn()}
				tableColumns={TABLE_COLUMNS}
				groupColumns={['service.name']}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-dimension-x')).toHaveTextContent(
			'Auto: first value',
		);
		expect(
			screen.getByTestId('panel-editor-v2-dimension-size'),
		).toHaveTextContent('None');
		expect(
			screen.getByText('None selected: colour by every group key.'),
		).toBeInTheDocument();
	});

	it('binds an axis to a value column by its key', async () => {
		const onChange = jest.fn();
		render(
			<DimensionsSection
				value={{ x: 'A.count()' }}
				onChange={onChange}
				tableColumns={TABLE_COLUMNS}
			/>,
		);

		await pick('y', 'p99(duration_nano)');

		expect(onChange).toHaveBeenCalledWith({
			x: 'A.count()',
			y: 'A.p99(duration_nano)',
		});
	});

	it('colours by any combination of group-by keys, kept in result order', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		const { rerender } = render(
			<DimensionsSection
				value={undefined}
				onChange={onChange}
				tableColumns={TABLE_COLUMNS}
				groupColumns={['k8s.namespace.name', 'k8s.pod.name']}
			/>,
		);

		await user.click(
			screen.getByTestId('panel-editor-v2-dimension-color-k8s.pod.name'),
		);
		expect(onChange).toHaveBeenLastCalledWith({ color: ['k8s.pod.name'] });

		rerender(
			<DimensionsSection
				value={{ color: ['k8s.pod.name'] }}
				onChange={onChange}
				tableColumns={TABLE_COLUMNS}
				groupColumns={['k8s.namespace.name', 'k8s.pod.name']}
			/>,
		);
		expect(
			screen.getByText('One colour per value of the selected keys.'),
		).toBeInTheDocument();

		await user.click(
			screen.getByTestId('panel-editor-v2-dimension-color-k8s.namespace.name'),
		);
		expect(onChange).toHaveBeenLastCalledWith({
			color: ['k8s.namespace.name', 'k8s.pod.name'],
		});
	});

	it('unselects the last colour key back to every key', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<DimensionsSection
				value={{ color: ['service.name'] }}
				onChange={onChange}
				groupColumns={['service.name']}
			/>,
		);

		await user.click(
			screen.getByTestId('panel-editor-v2-dimension-color-service.name'),
		);

		expect(onChange).toHaveBeenCalledWith({ color: [] });
	});

	it('keeps a selected colour key the results no longer have', () => {
		render(
			<DimensionsSection
				value={{ color: ['host.name'] }}
				onChange={jest.fn()}
				groupColumns={['service.name']}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-dimension-color-host.name'),
		).toHaveTextContent('host.name (not in results)');
	});

	it('asks for a group by when there is nothing to colour by', () => {
		render(<DimensionsSection value={undefined} onChange={jest.fn()} />);

		expect(
			screen.getByText('Group the query by a label to colour dots by it.'),
		).toBeInTheDocument();
	});

	it('clears the size back to none', async () => {
		const onChange = jest.fn();
		render(
			<DimensionsSection
				value={{ size: 'A.count()' }}
				onChange={onChange}
				tableColumns={TABLE_COLUMNS}
			/>,
		);

		await pick('size', 'None');

		expect(onChange).toHaveBeenCalledWith({ size: '' });
	});

	it('keeps a binding the results no longer have visible', () => {
		render(
			<DimensionsSection
				value={{ x: 'B' }}
				onChange={jest.fn()}
				tableColumns={TABLE_COLUMNS}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-dimension-x')).toHaveTextContent(
			'B (not in results)',
		);
	});
});
