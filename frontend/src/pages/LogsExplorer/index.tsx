import { Col, Row } from 'antd';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import LogExplorerQuerySection from 'container/LogExplorerQuerySection';
import LogsExplorerViews from 'container/LogsExplorerViews';
import LogsTopNav from 'container/LogsTopNav';
import Toolbar from 'container/Toolbar/Toolbar';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { DataSource } from 'types/common/queryBuilder';

import { WrapperStyled } from './styles';

function LogsExplorer(): JSX.Element {
	const [showHistogram, setShowHistogram] = useState(true);
	const [selectedView, setSelectedView] = useState('query-builder');

	const handleToggleShowHistogram = (): void => {
		setShowHistogram(!showHistogram);
	};

	console.log('showHistogram', showHistogram);

	return (
		<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
			{/* <LogsTopNav /> */}

			<Toolbar
				showHistogram={showHistogram}
				selectedView={selectedView}
				onToggleHistrogramVisibility={handleToggleShowHistogram}
			/>

			<WrapperStyled>
				<Row gutter={[0, 0]}>
					<Col xs={24}>
						<ExplorerCard sourcepage={DataSource.LOGS}>
							<LogExplorerQuerySection />
						</ExplorerCard>
					</Col>
					<Col xs={24}>
						<LogsExplorerViews
							selectedView={selectedView}
							showHistogram={showHistogram}
						/>
					</Col>
				</Row>
			</WrapperStyled>
		</ErrorBoundary>
	);
}

export default LogsExplorer;
