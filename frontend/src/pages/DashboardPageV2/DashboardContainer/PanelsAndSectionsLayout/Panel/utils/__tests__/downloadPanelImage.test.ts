import { toPng, toSvg } from 'html-to-image';
import { DownloadFormat } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';

import { downloadElementAsImage } from '../downloadPanelImage';

jest.mock('html-to-image', () => ({ toPng: jest.fn(), toSvg: jest.fn() }));

const mockToPng = toPng as jest.MockedFunction<typeof toPng>;
const mockToSvg = toSvg as jest.MockedFunction<typeof toSvg>;

describe('downloadElementAsImage', () => {
	let node: HTMLElement;
	let fakeLink: {
		href: string;
		download: string;
		click: jest.Mock;
		remove: jest.Mock;
	};

	beforeEach(() => {
		mockToPng.mockReset();
		mockToPng.mockResolvedValue('data:image/png;base64,AAAA');
		mockToSvg.mockReset();
		mockToSvg.mockResolvedValue('data:image/svg+xml;base64,BBBB');

		fakeLink = { href: '', download: '', click: jest.fn(), remove: jest.fn() };
		// Only stub the anchor used for the download; let every other tag (the
		// elements the filter test builds) fall through to the real DOM.
		const realCreateElement = document.createElement.bind(document);
		jest
			.spyOn(document, 'createElement')
			.mockImplementation((tag: string) =>
				tag === 'a'
					? (fakeLink as unknown as HTMLAnchorElement)
					: realCreateElement(tag),
			);

		node = document.createElement('div');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('captures a PNG via the png encoder, named after the panel', async () => {
		await downloadElementAsImage(node, 'My panel', DownloadFormat.PNG);

		expect(mockToPng).toHaveBeenCalledTimes(1);
		expect(mockToPng.mock.calls[0][0]).toBe(node);
		expect(mockToSvg).not.toHaveBeenCalled();
		expect(fakeLink.href).toBe('data:image/png;base64,AAAA');
		expect(fakeLink.download).toBe('My panel.png');
		expect(fakeLink.click).toHaveBeenCalledTimes(1);
		expect(fakeLink.remove).toHaveBeenCalledTimes(1);
	});

	it('captures an SVG via the svg encoder and extension', async () => {
		await downloadElementAsImage(node, 'My panel', DownloadFormat.SVG);

		expect(mockToSvg).toHaveBeenCalledTimes(1);
		expect(mockToPng).not.toHaveBeenCalled();
		expect(fakeLink.href).toBe('data:image/svg+xml;base64,BBBB');
		expect(fakeLink.download).toBe('My panel.svg');
	});

	it('filters the actions cluster (.panel-no-drag) out of the capture but keeps content', async () => {
		await downloadElementAsImage(node, 'x', DownloadFormat.PNG);

		const { filter } = mockToPng.mock.calls[0][1] as {
			filter: (n: HTMLElement) => boolean;
		};

		const actions = document.createElement('div');
		actions.classList.add('panel-no-drag');
		const chart = document.createElement('canvas');

		expect(filter(actions)).toBe(false);
		expect(filter(chart)).toBe(true);
	});

	it('falls back to "panel" when untitled and sanitizes filesystem-unsafe characters', async () => {
		await downloadElementAsImage(node, '   ', DownloadFormat.PNG);
		expect(fakeLink.download).toBe('panel.png');

		await downloadElementAsImage(node, 'errors/sec: p99', DownloadFormat.SVG);
		expect(fakeLink.download).toBe('errors-sec- p99.svg');
	});
});
