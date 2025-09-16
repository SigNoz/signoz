import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp } from 'types/api';
import { ExportRawDataProps } from 'types/api/exportRawData/getExportRawData';

export const downloadExportData = async (
	props: ExportRawDataProps,
): Promise<void> => {
	try {
		const queryParams = new URLSearchParams();

		queryParams.append('start', String(props.start));
		queryParams.append('end', String(props.end));
		queryParams.append('filter', props.filter);
		props.columns.forEach((col) => {
			queryParams.append('columns', col);
		});
		queryParams.append('order_by', props.orderBy);
		queryParams.append('limit', String(props.limit));
		queryParams.append('format', props.format);

		const response = await axios.get<Blob>(`export_raw_data?${queryParams}`, {
			responseType: 'blob', // Important: tell axios to handle response as blob
			decompress: true, // Enable automatic decompression
			headers: {
				Accept: 'application/octet-stream', // Tell server we expect binary data
			},
			timeout: 0,
		});

		// Only proceed if the response status is 200
		if (response.status !== 200) {
			throw new Error(
				`Failed to download data: server returned status ${response.status}`,
			);
		}
		// Create blob URL from response data
		const blob = new Blob([response.data], { type: 'application/octet-stream' });
		const url = window.URL.createObjectURL(blob);

		// Create and configure download link
		const link = document.createElement('a');
		link.href = url;

		// Get filename from Content-Disposition header or generate timestamped default
		const filename =
			response.headers['content-disposition']
				?.split('filename=')[1]
				?.replace(/["']/g, '') || `exported_data.${props.format || 'txt'}`;

		link.setAttribute('download', filename);

		// Trigger download
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default downloadExportData;
