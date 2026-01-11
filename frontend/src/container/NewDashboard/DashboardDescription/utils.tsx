import { ReactNode } from 'react';

export function downloadObjectAsJson(
	exportObj: unknown,
	exportName: string,
): void {
	const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
		JSON.stringify(exportObj),
	)}`;
	const downloadAnchorNode = document.createElement('a');
	downloadAnchorNode.setAttribute('href', dataStr);
	downloadAnchorNode.setAttribute('download', `${exportName}.json`);
	document.body.appendChild(downloadAnchorNode); // required for firefox
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
}

export const DEFAULT_ROW_NAME = 'Sample Row';

export function linkifyText(text: string): ReactNode[] {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const parts = text.split(urlRegex);

	return parts.map((part, index) => {
		if (part.match(urlRegex)) {
			return (
				<a
					key={`link-${index}`}
					href={part}
					target="_blank"
					rel="noopener noreferrer"
					className="dashboard-description-link"
				>
					{part}
				</a>
			);
		}
		return part;
	});
}
