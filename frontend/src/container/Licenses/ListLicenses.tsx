import { ColumnsType } from 'antd/lib/table';
import { ResizeTable } from 'components/ResizeTable';
import { useTranslation } from 'react-i18next';
import { License } from 'types/api/licenses/def';

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
			width: 80,
		},
		{
			title: t('column_valid_until'),
			dataIndex: 'ValidUntil',
			key: 'valid until',
			width: 80,
		},
	];

	return <ResizeTable columns={columns} rowKey="id" dataSource={licenses} />;
}

interface ListLicensesProps {
	licenses: License[];
}

export default ListLicenses;
