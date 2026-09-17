import type { Mock, MockedFunction } from 'vitest';
import { renderHook } from '@testing-library/react';
import { toast } from '@signozhq/ui/sonner';
import { DownloadFormat } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';

import { downloadElementAsImage } from '../../utils/downloadPanelImage';
import { useDownloadPanelImage } from '../useDownloadPanelImage';

vi.mock('../../utils/downloadPanelImage', () => ({
	downloadElementAsImage: vi.fn(),
}));

vi.mock('@signozhq/ui/sonner', async () => ({
	...(await vi.importActual('@signozhq/ui/sonner')),
	toast: { error: vi.fn(), dismiss: vi.fn() },
}));

const mockCapture = downloadElementAsImage as MockedFunction<
	typeof downloadElementAsImage
>;
const mockToastError = toast.error as Mock;

function mountPanel(panelId: string): HTMLElement {
	const node = document.createElement('div');
	node.setAttribute('data-panel-root', panelId);
	document.body.appendChild(node);
	return node;
}

describe('useDownloadPanelImage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
