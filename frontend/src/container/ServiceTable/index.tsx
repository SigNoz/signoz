import localStorageGet from 'api/browser/localstorage/get';
import localStorageSet from 'api/browser/localstorage/set';
import { ResizeTable } from 'components/ResizeTable';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { columns } from './Columns/ServiceColumn';
import ServiceTableProp from './ServiceTable';
import SkipBoardModal from './SkipOnBoardModal';
import { Container } from './styles';

function Services({ services, loading, error }: ServiceTableProp): JSX.Element {
	const { search } = useLocation();
	const [skipOnboarding, setSkipOnboarding] = useState(
		localStorageGet(SKIP_ONBOARDING) === 'true',
	);

	const onContinueClick = (): void => {
		localStorageSet(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};

	if (
		services.length === 0 &&
		loading === false &&
		!skipOnboarding &&
		error === true
	) {
		return <SkipBoardModal onContinueClick={onContinueClick} />;
	}

	const tableColumns = columns(search);

	return (
		<Container>
			<ResizeTable
				columns={tableColumns}
				loading={loading}
				dataSource={services}
				rowKey="serviceName"
			/>
		</Container>
	);
}

export default Services;
