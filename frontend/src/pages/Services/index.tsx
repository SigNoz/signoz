import { Space } from 'antd';
import { PerformantColumnResizingTable } from 'components/PerformantColumnResizingTable/PerformantColumnResizingTable';
import ReleaseNote from 'components/ReleaseNote';
import { useLocation } from 'react-router-dom';

function Metrics(): JSX.Element {
	const location = useLocation();

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />

			<PerformantColumnResizingTable />
		</Space>
	);
}

export default Metrics;
