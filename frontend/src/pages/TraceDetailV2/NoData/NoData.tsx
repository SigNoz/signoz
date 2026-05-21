import { Typography } from '@signozhq/ui/typography';
import { Button } from '@signozhq/ui/button';
import { handleContactSupport } from 'container/Integrations/utils';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { LifeBuoy, RefreshCw } from '@signozhq/icons';

import broomUrl from '@/assets/Icons/broom.svg';
import constructionUrl from '@/assets/Icons/construction.svg';
import noDataUrl from '@/assets/Icons/no-data.svg';

import './NoData.styles.scss';

function NoData(): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	return (
		<div className="not-found-trace">
			<section className="description">
				<img src={noDataUrl} alt="no-data" className="not-found-img" />
				<Typography.Text className="not-found-text-1">
					Uh-oh! We cannot show the selected trace.
					<span className="not-found-text-2">
						This can happen in either of the two scenarios -
					</span>
				</Typography.Text>
			</section>
			<section className="reasons">
				<div className="reason-1">
					<img src={constructionUrl} alt="no-data" className="construction-img" />
					<Typography.Text className="text">
						The trace data has not been rendered on your SigNoz server yet. You can
						wait for a bit and refresh this page if this is the case.
					</Typography.Text>
				</div>
				<div className="reason-2">
					<img src={broomUrl} alt="no-data" className="broom-img" />
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
						onClick={(): void => window.location.reload()}
						variant="outlined"
						color="secondary"
						prefix={<RefreshCw size={14} />}
					>
						Refresh this page
					</Button>
					<Button
						className="action-btn"
						onClick={(): void => handleContactSupport(isCloudUserVal)}
						variant="outlined"
						color="secondary"
						prefix={<LifeBuoy size={14} />}
					>
						Contact Support
					</Button>
				</div>
			</section>
		</div>
	);
}

export default NoData;
