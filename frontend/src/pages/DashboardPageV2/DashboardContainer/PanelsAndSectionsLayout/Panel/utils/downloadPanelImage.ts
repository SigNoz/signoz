import { toPng, toSvg } from 'html-to-image';
import { DownloadFormat } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import { toSafeFileName } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/toSafeFileName';

/** Image formats a panel can be exported to (both via html-to-image). */
export type PanelImageFormat = DownloadFormat.PNG | DownloadFormat.SVG;

// The actions cluster (search box, status popovers, three-dot menu) is chrome,
// not content — it carries this class to opt out of the grid drag handle (see
// PanelHeader), and we reuse it to drop the whole cluster from the capture.
const ACTIONS_CONTAINER_CLASS = 'panel-no-drag';

// Render raster output at 2x so the PNG stays crisp on retina displays. SVG is
// vector, so the ratio is irrelevant there (html-to-image ignores it).
const CAPTURE_PIXEL_RATIO = 2;

// Per-format encoder: html-to-image's toPng/toSvg share a signature and both
// return a ready-to-download data URL, so they differ only by file extension.
const FORMAT_ENCODERS: Record<
	PanelImageFormat,
	{ encode: typeof toPng; extension: PanelImageFormat }
> = {
	[DownloadFormat.PNG]: { encode: toPng, extension: DownloadFormat.PNG },
	[DownloadFormat.SVG]: { encode: toSvg, extension: DownloadFormat.SVG },
};

/**
 * Captures a panel's rendered DOM node as an image (PNG or SVG) and triggers a
 * browser download. The hover-only actions cluster is filtered out so the image
 * is just the panel title plus its chart/table. Resolves once the download is
 * initiated; rejects if the capture fails (the caller surfaces the error).
 */
export async function downloadElementAsImage(
	node: HTMLElement,
	fileBaseName: string,
	format: PanelImageFormat,
): Promise<void> {
	const { encode, extension } = FORMAT_ENCODERS[format];

	const dataUrl = await encode(node, {
		// Skip the actions cluster (and its subtree) — search/status/menu chrome.
		filter: (domNode) => !domNode.classList?.contains(ACTIONS_CONTAINER_CLASS),
		// `.panel` paints --l2-background; pass it explicitly so the rounded
		// corners fill with the panel colour instead of staying transparent.
		backgroundColor: window.getComputedStyle(node).backgroundColor,
		pixelRatio: CAPTURE_PIXEL_RATIO,
		cacheBust: true,
	});

	const link = document.createElement('a');
	link.href = dataUrl;
	link.download = `${toSafeFileName(fileBaseName)}.${extension}`;
	link.click();
	link.remove();
}
