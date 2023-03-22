import { Tabs, Typography } from 'antd';
import getAll from 'api/licenses/getAll';
import Spinner from 'components/Spinner';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

import ApplyLicenseForm from './ApplyLicenseForm';
import ListLicenses from './ListLicenses';

function Licenses(): JSX.Element {
	const { t } = useTranslation(['licenses']);
	const { data, isError, isLoading, refetch } = useQuery({
		queryFn: getAll,
		queryKey: 'getAllLicenses',
	});

	if (isError || data?.error) {
		return <Typography>{data?.error}</Typography>;
	}

	if (isLoading || data?.payload === undefined) {
		return <Spinner tip={t('loading_licenses')} height="90vh" />;
	}

	const allValidLicense =
		data?.payload?.filter((license) => license.isCurrent) || [];

	const tabs = [
		{
			label: t('tab_current_license'),
			key: 'licenses',
			children: <ApplyLicenseForm licenseRefetch={refetch} />,
		},
		{
			label: t('tab_license_history'),
			key: 'history',
			children: <ListLicenses licenses={allValidLicense} />,
		},
	];

	return (
		<Tabs destroyInactiveTabPane defaultActiveKey="licenses" items={tabs} />
	);
}

export default Licenses;
