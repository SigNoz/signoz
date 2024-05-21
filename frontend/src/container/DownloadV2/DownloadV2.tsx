import './DownloadV2.styles.scss';

import { Button, Popover, Typography } from 'antd';
import { Excel } from 'antd-table-saveas-excel';
import { FileDigit, FileDown, Sheet } from 'lucide-react';
import { unparse } from 'papaparse';

import { DownloadProps } from './DownloadV2.types';

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

	return (
		<Popover
			trigger={['click']}
			placement="bottomRight"
			rootClassName="download-logs-popover"
			arrow={false}
			content={
				<div className="download-logs-content">
					<Typography.Text className="export-heading">Export As</Typography.Text>
					<Button
						icon={<Sheet size={14} />}
						type="text"
						onClick={downloadExcelFile}
						className="action-btns"
					>
						Excel (.xlsx)
					</Button>
					<Button
						icon={<FileDigit size={14} />}
						type="text"
						onClick={downloadCsvFile}
						className="action-btns"
					>
						CSV
					</Button>
				</div>
			}
		>
			<Button
				className="periscope-btn"
				loading={isLoading}
				icon={<FileDown size={14} />}
			/>
		</Popover>
	);
}

Download.defaultProps = {
	isLoading: undefined,
};

export default Download;
