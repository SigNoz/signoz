import './ErrorBoundaryFallback.styles.scss';

import { BugOutlined } from '@ant-design/icons';
import { Button, Card, Typography } from 'antd';
import Slack from 'container/SideNav/Slack';

function ErrorBoundaryFallback(): JSX.Element {
	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	return (
		<Card size="small">
			<div className="flex">
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
				<Button
					className="flex"
					type="default"
					onClick={onClickSlackHandler}
					icon={<Slack />}
				>
					{' '}
					Support{' '}
				</Button>
			</>
		</Card>
	);
}

export default ErrorBoundaryFallback;
