import localStorageGet from 'api/browser/localstorage/get';
import localStorageSet from 'api/browser/localstorage/set';
import { ResizeTable } from 'components/ResizeTable';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { columns } from './Columns/MetricsColumn';
import MatricsTableProp from './MetricsTable';
import SkipBoardModal from './SkipOnBoardModal';
import { Container } from './styles';

function Metrics({ services, loading, error }: MatricsTableProp): JSX.Element {
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

	return (
		<Container>
			<ResizeTable
				columns={columns(search)}
				loading={loading}
				dataSource={services}
				rowKey="serviceName"
			/>
		</Container>
	);
}

export default Metrics;
