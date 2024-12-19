import { Space } from 'antd';
import ReleaseNote from 'components/ReleaseNote';
import ServicesApplication from 'container/ServiceApplication';
import { useLocation } from 'react-router-dom';

function Metrics(): JSX.Element {
	const location = useLocation();

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />

			<ServicesApplication />
		</Space>
	);
}

export default Metrics;
