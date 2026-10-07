import { render, screen, userEvent } from 'tests/test-utils';

import DimensionsSection from '../DimensionsSection';

const TABLE_COLUMNS = [
	{ key: 'A', label: 'A.Request rate', name: 'Request rate' },
	{ key: 'B.p99(duration_nano)', label: 'B.p99 latency', name: 'p99 latency' },
	{ key: 'C.count()', label: 'C.count()', name: 'count()' },
];

async function pick(dimension: string, label: string): Promise<void> {
	const user = userEvent.setup();
	const trigger = screen.getByTestId(`panel-editor-v2-dimension-${dimension}`);
	await user.click(trigger.querySelector('.ant-select-selector') as HTMLElement);
	await user.click(await screen.findByRole('option', { name: label }));
}

describe('DimensionsSection', () => {
	it('names the column each unset axis falls back to', () => {
		render(
			<DimensionsSection
				value={undefined}
				onChange={jest.fn()}
				tableColumns={TABLE_COLUMNS}
				groupColumns={['service.name']}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-dimension-x')).toHaveTextContent(
			'Auto (A · Request rate)',
		);
		expect(screen.getByTestId('panel-editor-v2-dimension-y')).toHaveTextContent(
			'Auto (B.p99(duration_nano) · p99 latency)',
		);
		expect(
			screen.getByTestId('panel-editor-v2-dimension-sizeBy'),
		).toHaveTextContent('None');
	});

	it('falls Y back to a column other than the bound X', () => {
		render(
			<DimensionsSection
				value={{ x: 'B.p99(duration_nano)' }}
				onChange={jest.fn()}
				tableColumns={TABLE_COLUMNS}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-dimension-y')).toHaveTextContent(
			'Auto (A · Request rate)',
		);
	});

	it('shows a column by its key alone when the name only repeats it', async () => {
		const onChange = jest.fn();
		render(
			<DimensionsSection
				value={undefined}
				onChange={onChange}
				tableColumns={TABLE_COLUMNS}
			/>,
		);

		await pick('sizeBy', 'C.count()');

		expect(onChange).toHaveBeenCalledWith({ sizeBy: 'C.count()' });
	});

	it('binds an axis to a value column by its key', async () => {
		const onChange = jest.fn();
		render(
			<DimensionsSection
				value={{ x: 'A' }}
				onChange={onChange}
				tableColumns={TABLE_COLUMNS}
			/>,
		);

		await pick('y', 'B.p99(duration_nano) · p99 latency');

		expect(onChange).toHaveBeenCalledWith({
			x: 'A',
			y: 'B.p99(duration_nano)',
		});
	});

	it('clears the size back to none', async () => {
		const onChange = jest.fn();
		render(
			<DimensionsSection
				value={{ sizeBy: 'A' }}
				onChange={onChange}
				tableColumns={TABLE_COLUMNS}
			/>,
		);

		await pick('sizeBy', 'None');

		expect(onChange).toHaveBeenCalledWith({ sizeBy: '' });
	});

	it('keeps a binding the results no longer have visible', () => {
		render(
			<DimensionsSection
				value={{ x: 'D' }}
				onChange={jest.fn()}
				tableColumns={TABLE_COLUMNS}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-dimension-x')).toHaveTextContent(
			'D (not in results)',
		);
	});

	it('colours by any combination of group-by keys, kept in result order', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<DimensionsSection
				value={{ colorBy: ['service.name'] }}
				onChange={onChange}
				groupColumns={['k8s.namespace.name', 'service.name']}
			/>,
		);

		const trigger = screen.getByTestId('panel-editor-v2-dimension-colorBy');
		await user.click(
			trigger.querySelector('.ant-select-selector') as HTMLElement,
		);
		await user.click(
			await screen.findByRole('option', { name: 'k8s.namespace.name' }),
		);

		expect(onChange).toHaveBeenLastCalledWith({
			colorBy: ['k8s.namespace.name', 'service.name'],
		});
	});

	it('explains every field from an info icon', () => {
		render(<DimensionsSection value={undefined} onChange={jest.fn()} />);

		['x', 'y', 'sizeBy', 'colorBy'].forEach((dimension) => {
			expect(
				screen.getByTestId(`panel-editor-v2-dimension-${dimension}-info`),
			).toBeInTheDocument();
		});
	});

	it('says what an empty colour selection means', () => {
		render(
			<DimensionsSection
				value={undefined}
				onChange={jest.fn()}
				groupColumns={['service.name']}
			/>,
		);

		expect(screen.getByText('Every group key')).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-dimension-colorBy-info'),
		).toBeInTheDocument();
	});

	it('keeps a selected colour key the results no longer have', () => {
		render(
			<DimensionsSection
				value={{ colorBy: ['host.name'] }}
				onChange={jest.fn()}
				groupColumns={['service.name']}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-dimension-colorBy'),
		).toHaveTextContent('host.name (not in results)');
	});

	it('disables colour when the query has no group by', () => {
		render(<DimensionsSection value={undefined} onChange={jest.fn()} />);

		expect(screen.getByText('No group-by labels')).toBeInTheDocument();
		expect(
			screen
				.getByTestId('panel-editor-v2-dimension-colorBy')
				.classList.contains('ant-select-disabled'),
		).toBe(true);
	});
});
