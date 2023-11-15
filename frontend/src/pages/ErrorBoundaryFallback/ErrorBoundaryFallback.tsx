import './ErrorBoundaryFallback.styles.scss';

import { BugOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Card, Typography } from 'antd';
import Slack from 'container/SideNav/Slack';

function ErrorBoundaryFallback(): JSX.Element {
	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	const handleReload = (): void => {
		window.location.reload();
	};
	return (
		<Card size="small" className="error-boundary-fallback-container">
			<div className="title">
				<BugOutlined />
				<Typography.Title type="danger" level={4} style={{ margin: 0 }}>
					{' '}
					Oops !!! Something went wrong
				</Typography.Title>
			</div>

			<>
				<p>
					Don&apos;t worry, our team is here to help. Please contact support if the
					issue persists.
				</p>

				<div className="actions">
					<Button
						className="actionBtn"
						type="default"
						onClick={handleReload}
						icon={<UndoOutlined />}
					>
						Reload
					</Button>

					<Button
						className="actionBtn"
						type="default"
						onClick={onClickSlackHandler}
						icon={<Slack />}
					>
						&nbsp; Support
					</Button>
				</div>
			</>
		</Card>
	);
}

export default ErrorBoundaryFallback;
