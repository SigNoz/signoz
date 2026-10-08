import { act, render, screen } from '@testing-library/react';

import { usePanelPickerTargetStore } from '../../../../store/usePanelPickerTargetStore';
import DraftSection from '../DraftSection';

jest.mock('../../../../Panels/registry', () => ({
	getPanelDefinition: (): { displayName: string } => ({ displayName: 'Table' }),
}));

describe('DraftSection', () => {
	const scrollTo = jest.fn();
	const setDraft = (title: string): void =>
		usePanelPickerTargetStore
			.getState()
			.setDraftSection({ title, panelKind: 'signoz/TablePanel' });

	beforeEach(() => {
		usePanelPickerTargetStore.getState().reset();
		scrollTo.mockClear();
		// jsdom elements have no scrollTo.
		Object.defineProperty(document.documentElement, 'scrollTo', {
			value: scrollTo,
			configurable: true,
		});
		jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
			cb(0);
			return 0;
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders nothing while no section is being created', () => {
		render(<DraftSection />);

		expect(screen.queryByTestId('draft-section')).not.toBeInTheDocument();
	});

	it('previews the typed name with the new panel, scrolling to it once', () => {
		render(<DraftSection />);

		act(() => setDraft(''));
		expect(screen.getByText('New section')).toBeInTheDocument();
		expect(screen.getByTestId('new-panel-placeholder')).toHaveTextContent(
			'Table',
		);

		act(() => setDraft('Errors'));
		expect(screen.getByText('Errors')).toBeInTheDocument();
		expect(scrollTo).toHaveBeenCalledTimes(1);
	});
});
