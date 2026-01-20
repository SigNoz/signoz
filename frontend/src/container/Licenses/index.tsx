import './Licenses.styles.scss';

import Spinner from 'components/Spinner';
import { Wrench } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useTranslation } from 'react-i18next';

import ApplyLicenseForm from './ApplyLicenseForm';

function Licenses(): JSX.Element {
	const { t, ready: translationsReady } = useTranslation(['licenses']);
	const { activeLicenseRefetch } = useAppContext();

	if (!translationsReady) {
		return <Spinner tip={t('loading_licenses')} height="90vh" />;
	}

	return (
		<div className="licenses-page">
			<header className="licenses-page-header">
				<div className="licenses-page-header-title">
					<Wrench size={16} />
					License
				</div>
			</header>

			<div className="licenses-page-content-container">
				<ApplyLicenseForm licenseRefetch={activeLicenseRefetch} />
			</div>
		</div>
	);
}

export default Licenses;
