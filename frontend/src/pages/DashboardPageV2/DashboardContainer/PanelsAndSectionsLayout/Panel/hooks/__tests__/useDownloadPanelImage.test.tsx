import { renderHook } from '@testing-library/react';
import { toast } from '@signozhq/ui/sonner';
import { DownloadFormat } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';

import { downloadElementAsImage } from '../../utils/downloadPanelImage';
import { useDownloadPanelImage } from '../useDownloadPanelImage';

jest.mock('../../utils/downloadPanelImage', () => ({
	downloadElementAsImage: jest.fn(),
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { error: jest.fn(), dismiss: jest.fn() },
}));

const mockCapture = downloadElementAsImage as jest.MockedFunction<
	typeof downloadElementAsImage
>;
const mockToastError = toast.error as jest.Mock;

function mountPanel(panelId: string): HTMLElement {
	const node = document.createElement('div');
	node.setAttribute('data-panel-root', panelId);
	document.body.appendChild(node);
	return node;
}

describe('useDownloadPanelImage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		document.body.innerHTML = '';
	});

	it('captures the panel node located by its data-panel-root marker, forwarding the format', async () => {
		const node = mountPanel('panel-1');
		mockCapture.mockResolvedValue();

		const { result } = renderHook(() => useDownloadPanelImage());
		await result.current.downloadPanelImage(
			'panel-1',
			'My panel',
			DownloadFormat.SVG,
		);

		expect(mockCapture).toHaveBeenCalledWith(
			node,
			'My panel',
			DownloadFormat.SVG,
		);
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it('does nothing when no panel matches the id (e.g. unmounted)', async () => {
		const { result } = renderHook(() => useDownloadPanelImage());
		await result.current.downloadPanelImage('missing', 'x', DownloadFormat.PNG);

		expect(mockCapture).not.toHaveBeenCalled();
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it('surfaces an error notification when the capture fails', async () => {
		mountPanel('panel-2');
		mockCapture.mockRejectedValue(new Error('capture boom'));

		const { result } = renderHook(() => useDownloadPanelImage());
		await result.current.downloadPanelImage('panel-2', 'x', DownloadFormat.PNG);

		expect(mockToastError).toHaveBeenCalledTimes(1);
	});
});
