import './NoData.styles.scss';

import { Button, Typography } from 'antd';
import { LifeBuoy, RefreshCw } from 'lucide-react';
import { handleContactSupport } from 'pages/Integrations/utils';
import { isCloudUser } from 'utils/app';

function NoData(): JSX.Element {
	const isCloudUserVal = isCloudUser();
	return (
		<div className="not-found-trace">
			<section className="description">
				<img src="/Icons/no-data.svg" alt="no-data" className="not-found-img" />
				<Typography.Text className="not-found-text-1">
					Uh-oh! We cannot show the selected trace.
					<span className="not-found-text-2">
						This can happen in either of the two scenraios -
					</span>
				</Typography.Text>
			</section>
			<section className="reasons">
				<div className="reason-1">
					<img
						src="/Icons/construction.svg"
						alt="no-data"
						className="construction-img"
					/>
					<Typography.Text className="text">
						The trace data has not been rendered on your SigNoz server yet. You can
						wait for a bit and refresh this page if this is the case.
					</Typography.Text>
				</div>
				<div className="reason-2">
					<img src="/Icons/broom.svg" alt="no-data" className="broom-img" />
					<Typography.Text className="text">
						The trace has been deleted as the data has crossed it’s retention period.
					</Typography.Text>
				</div>
			</section>
			<section className="none-of-above">
				<Typography.Text className="text">
					If you feel the issue is none of the above, please contact support.
				</Typography.Text>
				<div className="action-btns">
					<Button
						className="action-btn"
						icon={<RefreshCw size={14} />}
						onClick={(): void => window.location.reload()}
					>
						Refresh this page
					</Button>
					<Button
						className="action-btn"
						icon={<LifeBuoy size={14} />}
						onClick={(): void => handleContactSupport(isCloudUserVal)}
					>
						Contact Support
					</Button>
				</div>
			</section>
		</div>
	);
}

export default NoData;
