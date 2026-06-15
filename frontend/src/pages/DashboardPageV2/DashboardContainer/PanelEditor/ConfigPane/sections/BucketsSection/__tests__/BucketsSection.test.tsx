import { fireEvent, render, screen } from '@testing-library/react';

import BucketsSection from '../BucketsSection';

describe('BucketsSection', () => {
	it('renders only the controls whose flag is set', () => {
		render(
			<BucketsSection
				value={undefined}
				controls={{ count: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-bucket-count'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-bucket-width'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-merge-queries'),
		).not.toBeInTheDocument();
	});

	it('writes a numeric bucket count and clears it to null when emptied', () => {
		const onChange = jest.fn();
		const { rerender } = render(
			<BucketsSection
				value={undefined}
				controls={{ count: true }}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByTestId('panel-editor-v2-bucket-count'), {
			target: { value: '20' },
		});
		expect(onChange).toHaveBeenLastCalledWith({ bucketCount: 20 });

		rerender(
			<BucketsSection
				value={{ bucketCount: 20 }}
				controls={{ count: true }}
				onChange={onChange}
			/>,
		);
		fireEvent.change(screen.getByTestId('panel-editor-v2-bucket-count'), {
			target: { value: '' },
		});
		expect(onChange).toHaveBeenLastCalledWith({ bucketCount: null });
	});

	it('toggles merge-active-queries through onChange', () => {
		const onChange = jest.fn();
		render(
			<BucketsSection
				value={{ mergeAllActiveQueries: false }}
				controls={{ mergeQueries: true }}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByTestId('panel-editor-v2-merge-queries'));

		expect(onChange).toHaveBeenCalledWith({ mergeAllActiveQueries: true });
	});
});
