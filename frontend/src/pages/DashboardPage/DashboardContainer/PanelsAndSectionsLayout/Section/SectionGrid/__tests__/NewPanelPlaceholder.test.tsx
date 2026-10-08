import { render, screen } from '@testing-library/react';

import { usePanelPickerTargetStore } from '../../../../store/usePanelPickerTargetStore';
import NewPanelPlaceholder from '../NewPanelPlaceholder';

jest.mock('../../../../Panels/registry', () => ({
	getPanelDefinition: (): { displayName: string } => ({ displayName: 'Table' }),
}));

describe('NewPanelPlaceholder', () => {
	const scrollTo = jest.fn();

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

	it('names the kind and scrolls to it, recording the prior scroll position', () => {
		render(<NewPanelPlaceholder kind="signoz/TablePanel" />);

		expect(screen.getByTestId('new-panel-placeholder')).toHaveTextContent(
			'TableNew panel',
		);
		expect(scrollTo).toHaveBeenCalledWith(
			expect.objectContaining({ behavior: 'smooth' }),
		);
		expect(usePanelPickerTargetStore.getState().scrollOrigin).not.toBeNull();
	});
});
