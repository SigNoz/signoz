import { act, render, screen } from '@testing-library/react';

import { usePanelPickerTargetStore } from '../../../../store/usePanelPickerTargetStore';
import DraftSection from '../DraftSection';

describe('DraftSection', () => {
	let scrollIntoView: jest.SpyInstance;

	beforeEach(() => {
		usePanelPickerTargetStore.getState().reset();
		scrollIntoView = jest.spyOn(HTMLElement.prototype, 'scrollIntoView');
	});

	afterEach(() => {
		scrollIntoView.mockRestore();
	});

	it('renders nothing while no section is being created', () => {
		render(<DraftSection />);

		expect(screen.queryByTestId('draft-section')).not.toBeInTheDocument();
	});

	it('previews the typed name and scrolls to it once', () => {
		render(<DraftSection />);

		act(() => usePanelPickerTargetStore.getState().setDraftSectionTitle(''));
		expect(screen.getByText('New section')).toBeInTheDocument();

		act(() =>
			usePanelPickerTargetStore.getState().setDraftSectionTitle('Errors'),
		);
		expect(screen.getByText('Errors')).toBeInTheDocument();
		expect(scrollIntoView).toHaveBeenCalledTimes(1);
		expect(usePanelPickerTargetStore.getState().scrollOrigin).not.toBeNull();
	});
});
