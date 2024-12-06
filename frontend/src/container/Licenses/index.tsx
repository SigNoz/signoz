import { Tabs, Typography } from 'antd';
import Spinner from 'components/Spinner';
import useLicense from 'hooks/useLicense';
import { useAppContext } from 'providers/App/App';
import { useTranslation } from 'react-i18next';

import ApplyLicenseForm from './ApplyLicenseForm';
import ListLicenses from './ListLicenses';

function Licenses(): JSX.Element {
	const { t, ready: translationsReady } = useTranslation(['licenses']);
	const { isLoggedIn } = useAppContext();
	// we need explicit license fetch here and reload so no need to extract from licenses context
	const { data, isError, isLoading, refetch } = useLicense(isLoggedIn);

	if (isError || data?.error) {
		return <Typography>{data?.error}</Typography>;
	}

	if (isLoading || data?.payload === undefined || !translationsReady) {
		return <Spinner tip={t('loading_licenses')} height="90vh" />;
	}

	const allValidLicense =
		data?.payload?.licenses?.filter((license) => license.isCurrent) || [];

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
