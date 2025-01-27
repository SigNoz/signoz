import { Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { ResizeTable } from 'components/ResizeTable';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';
import { useTranslation } from 'react-i18next';
import { License } from 'types/api/licenses/def';

function ValidityColumn({ value }: { value: string }): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return (
		<Typography>
			{formatTimezoneAdjustedTimestamp(value, DATE_TIME_FORMATS.ISO_DATETIME_UTC)}
		</Typography>
	);
}

function ListLicenses({ licenses }: ListLicensesProps): JSX.Element {
	const { t } = useTranslation(['licenses']);

	const columns: ColumnsType<License> = [
		{
			title: t('column_license_status'),
			dataIndex: 'status',
			key: 'status',
			width: 100,
		},
		{
			title: t('column_license_key'),
			dataIndex: 'key',
			key: 'key',
			width: 80,
		},
		{
			title: t('column_valid_from'),
			dataIndex: 'ValidFrom',
			key: 'valid from',
			render: (value: string): JSX.Element => ValidityColumn({ value }),
			width: 80,
		},
		{
			title: t('column_valid_until'),
			dataIndex: 'ValidUntil',
			key: 'valid until',
			render: (value: string): JSX.Element => ValidityColumn({ value }),
			width: 80,
		},
	];

	return <ResizeTable columns={columns} rowKey="id" dataSource={licenses} />;
}

interface ListLicensesProps {
	licenses: License[];
}

export default ListLicenses;
