import './Download.styles.scss';

import { CloudDownloadOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';
import { Excel } from 'antd-table-saveas-excel';
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
		<Dropdown menu={menu} trigger={['click']}>
			<Button
				className="download-button"
				loading={isLoading}
				size="small"
				type="link"
			>
				<CloudDownloadOutlined />
				Download
			</Button>
		</Dropdown>
	);
}

Download.defaultProps = {
	isLoading: undefined,
};

export default Download;
