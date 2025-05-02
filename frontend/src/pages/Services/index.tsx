import { Space } from 'antd';
import ServicesApplication from 'container/ServiceApplication';

function Metrics(): JSX.Element {
	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<ServicesApplication />
		</Space>
	);
}

export default Metrics;
