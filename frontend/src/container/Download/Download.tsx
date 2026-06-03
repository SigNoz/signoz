import { useState } from 'react';
import { CloudDownload } from '@signozhq/icons';
import { Button, Dropdown, MenuProps, Flex } from 'antd';
import { unparse } from 'papaparse';

import { DownloadProps } from './Download.types';

import './Download.styles.scss';

function Download({ data, isLoading, fileName }: DownloadProps): JSX.Element {
	const [isDownloading, setIsDownloading] = useState(false);

	const getFileName = (): string =>
		typeof fileName === 'function' ? fileName() : fileName;

	const downloadExcelFile = async (): Promise<void> => {
		setIsDownloading(true);

		try {
			const resolvedFileName = getFileName();
			const headers = Object.keys(Object.assign({}, ...data)).map((item) => {
				const updatedTitle = item
					.split('_')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
				return {
					title: updatedTitle,
					dataIndex: item,
				};
			});

			const excelLib = await import('antd-table-saveas-excel');

			const excel = new excelLib.Excel();
			excel
				.addSheet(resolvedFileName)
				.addColumns(headers)
				.addDataSource(data, {
					str2Percent: true,
				})
				.saveAs(`${resolvedFileName}.xlsx`);
		} finally {
			setIsDownloading(false);
		}
	};

	const downloadCsvFile = (): void => {
		const resolvedFileName = getFileName();
		const csv = unparse(data);
		const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const csvUrl = URL.createObjectURL(csvBlob);
		const downloadLink = document.createElement('a');
		downloadLink.href = csvUrl;
		downloadLink.download = `${resolvedFileName}.csv`;
		downloadLink.click();
		downloadLink.remove();
	};

	const menu: MenuProps = {
		items: [
			{
				key: 'download-as-excel',
				label: 'Excel',
				onClick: downloadExcelFile,
			},
			{
				key: 'download-as-csv',
				label: 'CSV',
				onClick: downloadCsvFile,
			},
		],
	};

	return (
		<Dropdown menu={menu} trigger={['click']}>
			<Button
				className="download-button"
				loading={isLoading || isDownloading}
				size="small"
				type="link"
			>
				<Flex align="center" gap={4}>
					<CloudDownload size="md" />
					Download
				</Flex>
			</Button>
		</Dropdown>
	);
}

Download.defaultProps = {
	isLoading: undefined,
};

export default Download;
