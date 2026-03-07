export function downloadFile(content: string, filename: string): Promise<void> {
	return new Promise((resolve, reject) => {
		try {
			const blob = new Blob([content], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);

			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', filename);
			document.body.appendChild(link);
			link.click();

			// Clean up after the download
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			resolve(); // Resolve the promise when download is triggered
		} catch (error) {
			reject(error); // Reject in case of any errors
		}
	});
}
