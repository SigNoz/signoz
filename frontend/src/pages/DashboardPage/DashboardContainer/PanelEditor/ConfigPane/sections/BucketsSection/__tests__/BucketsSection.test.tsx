import { render, screen, userEvent } from 'tests/test-utils';

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

	it('toggles merge-active-queries through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<BucketsSection
				value={{ mergeAllActiveQueries: false }}
				controls={{ mergeQueries: true }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-editor-v2-merge-queries'));

		expect(onChange).toHaveBeenCalledWith({ mergeAllActiveQueries: true });
	});
});
