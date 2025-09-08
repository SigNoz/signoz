import './InfraMonitoringK8s.styles.scss';

import { Skeleton } from 'antd';

function LoadingContainer(): JSX.Element {
	return (
		<div className="k8s-list-loading-state" data-testid="loader">
			<Skeleton.Input
				className="k8s-list-loading-state-item"
				size="large"
				block
				active
			/>
			<Skeleton.Input
				className="k8s-list-loading-state-item"
				size="large"
				block
				active
			/>
			<Skeleton.Input
				className="k8s-list-loading-state-item"
				size="large"
				block
				active
			/>
		</div>
	);
}

export default LoadingContainer;
