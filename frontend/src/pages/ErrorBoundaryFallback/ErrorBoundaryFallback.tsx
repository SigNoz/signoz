import './ErrorBoundaryFallback.styles.scss';

import { BugOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import ROUTES from 'constants/routes';
import Slack from 'container/SideNav/Slack';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Home, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function ErrorBoundaryFallback(): JSX.Element {
	const { safeNavigate } = useSafeNavigate();

	const { t } = useTranslation(['errorDetails']);

	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	const handleReload = (): void => {
		// Go to home page

		safeNavigate(ROUTES.HOME);
	};
	return (
		<div className="error-boundary-fallback-container">
			<div className="error-icon">
				<TriangleAlert size={48} />
			</div>
			<div className="title">
				<BugOutlined />
				<Typography.Title type="danger" level={4} style={{ margin: 0 }}>
					{t('something_went_wrong')}
				</Typography.Title>
			</div>

			<p>{t('contact_if_issue_exists')}</p>

			<div className="actions">
				<Button
					type="primary"
					onClick={handleReload}
					icon={<Home size={16} />}
					className="periscope-btn primary"
				>
					Go Home
				</Button>

				<Button
					className="periscope-btn secondary"
					type="default"
					onClick={onClickSlackHandler}
					icon={<Slack />}
				>
					Slack Support
				</Button>
			</div>
		</div>
	);
}

export default ErrorBoundaryFallback;
