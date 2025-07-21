import './ErrorBoundaryFallback.styles.scss';

import { BugOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import Slack from 'container/SideNav/Slack';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function ErrorBoundaryFallback(): JSX.Element {
	const { t } = useTranslation(['errorDetails']);

	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	const handleReload = (): void => {
		// try accessing the previous page - related to the signoz domain
		const previousPage = window?.history?.state?.back;

		if (previousPage?.includes('signoz.io')) {
			window.location.href = previousPage;
		} else {
			window.location.reload();
		}
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
					icon={<UndoOutlined />}
					className="periscope-btn primary"
				>
					Reload
				</Button>

				<Button
					className="periscope-btn"
					type="default"
					onClick={onClickSlackHandler}
					icon={<Slack />}
				>
					&nbsp; Support
				</Button>
			</div>
		</div>
	);
}

export default ErrorBoundaryFallback;
