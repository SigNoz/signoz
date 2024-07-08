import { fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'ReactI18';
import store from 'store';

import PipelinesSearchSection from '../Layouts/Pipeline/PipelinesSearchSection';

describe('PipelinePage container test', () => {
	it('should render PipelinesSearchSection section', () => {
		const { asFragment } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelinesSearchSection setPipelineSearchValue={jest.fn()} />
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);
		expect(asFragment()).toMatchSnapshot();
	});

	it.skip('should handle search', async () => {
		const setPipelineValue = jest.fn();
		const { getByPlaceholderText, container } = render(
			<MemoryRouter>
				<Provider store={store}>
					<I18nextProvider i18n={i18n}>
						<PipelinesSearchSection setPipelineSearchValue={setPipelineValue} />
					</I18nextProvider>
				</Provider>
			</MemoryRouter>,
		);

		const searchInput = getByPlaceholderText('search_pipeline_placeholder');

		// Type into the search input
		userEvent.type(searchInput, 'sample_pipeline');

		jest.advanceTimersByTime(299);
		expect(setPipelineValue).not.toHaveBeenCalled();

		// Fast-forward time by 1ms to reach the debounce delay
		jest.advanceTimersByTime(1);

		// Wait for the debounce delay to pass and expect the callback to be called
		await waitFor(() => {
			expect(setPipelineValue).toHaveBeenCalledWith('sample_pipeline');
		});

		// clear button
		fireEvent.click(
			container.querySelector(
				'span[class*="ant-input-clear-icon"]',
			) as HTMLElement,
		);

		// Wait for the debounce delay to pass
		await waitFor(() => {
			expect(setPipelineValue).toHaveBeenCalledWith('');
		});
	});
});
