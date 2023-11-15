import './ErrorBoundaryFallback.styles.scss';

import { BugOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Card, Typography } from 'antd';
import Slack from 'container/SideNav/Slack';
import { useTranslation } from 'react-i18next';

function ErrorBoundaryFallback(): JSX.Element {
	const { t } = useTranslation(['errorDetails']);

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
					{t('something_went_wrong')}
				</Typography.Title>
			</div>

			<>
				<p>{t('contact_if_issue_exists')}</p>

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
