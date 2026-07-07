import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp } from 'types/api';
import { ExportRawDataProps } from 'types/api/exportRawData/getExportRawData';

export const downloadExportData = async (
	props: ExportRawDataProps,
): Promise<void> => {
	try {
		const response = await axios.post<Blob>(
			`export_raw_data?format=${encodeURIComponent(props.format)}`,
			props.body,
			{
				responseType: 'blob',
				decompress: true,
				headers: {
					Accept: 'application/octet-stream',
					'Content-Type': 'application/json',
				},
				timeout: 0,
			},
		);

		if (response.status !== 200) {
			throw new Error(
				`Failed to download data: server returned status ${response.status}`,
			);
		}

		const blob = new Blob([response.data], { type: 'application/octet-stream' });
		const url = window.URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;

		const filename =
			response.headers['content-disposition']
				?.split('filename=')[1]
				?.replace(/["']/g, '') || `exported_data.${props.format || 'txt'}`;

		link.setAttribute('download', filename);

		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default downloadExportData;
