import { Alert, Space } from 'antd';
import { SIGNOZ_UPGRADE_PLAN_URL } from 'constants/app';
import React from 'react';

type UpgradePromptProps = {
	title?: string;
};

function UpgradePrompt({ title }: UpgradePromptProps): JSX.Element {
	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<Alert
				message={title}
				description={
					<div>
						This feature is available for Enterprise plans.{' '}
						<a href={SIGNOZ_UPGRADE_PLAN_URL} target="_blank" rel="noreferrer">
							Click here
						</a>{' '}
						to Upgrade
					</div>
				}
				type="warning"
			/>{' '}
		</Space>
	);
}

UpgradePrompt.defaultProps = {
	title: 'Upgrade to Enterprise Plan',
};
export default UpgradePrompt;
