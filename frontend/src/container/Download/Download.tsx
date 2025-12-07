import './Download.styles.scss';

import { Button, Dropdown, MenuProps, Tooltip } from 'antd';
import { Excel } from 'antd-table-saveas-excel';
import { DownloadIcon } from 'lucide-react';
import { unparse } from 'papaparse';

import { DownloadProps } from './Download.types';

function Download({ data, isLoading, fileName }: DownloadProps): JSX.Element {
	const downloadExcelFile = (): void => {
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
		const excel = new Excel();
		excel
			.addSheet(fileName)
			.addColumns(headers)
			.addDataSource(data, {
				str2Percent: true,
			})
			.saveAs(`${fileName}.xlsx`);
	};

	const downloadCsvFile = (): void => {
		const csv = unparse(data);
		const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const csvUrl = URL.createObjectURL(csvBlob);
		const downloadLink = document.createElement('a');
		downloadLink.href = csvUrl;
		downloadLink.download = `${fileName}.csv`;
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
		<Tooltip title="Download" placement="top">
			<Dropdown menu={menu} trigger={['click']}>
				<Button
					className="periscope-btn ghost"
					loading={isLoading}
					disabled={isLoading}
					icon={<DownloadIcon size={18} />}
				/>
			</Dropdown>
		</Tooltip>
	);
}

Download.defaultProps = {
	isLoading: undefined,
};

export default Download;
