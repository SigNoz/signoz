import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { handleContactSupport } from 'container/Integrations/utils';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { LifeBuoy, RefreshCw } from '@signozhq/icons';

import broomUrl from '@/assets/Icons/broom.svg';
import constructionUrl from '@/assets/Icons/construction.svg';
import noDataUrl from '@/assets/Icons/no-data.svg';

import styles from './NoData.module.scss';

function NoData(): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	return (
		<div className={styles.notFoundTrace} data-testid="trace-no-data">
			<section className={styles.description}>
				<img src={noDataUrl} alt="no-data" className={styles.notFoundImg} />
				<Typography.Text className={styles.notFoundText1}>
					Uh-oh! We cannot show the selected trace.
					<span className={styles.notFoundText2}>
						This can happen in either of the two scenarios -
					</span>
				</Typography.Text>
			</section>
			<section className={styles.reasons}>
				<div className={styles.reason}>
					<img src={constructionUrl} alt="no-data" className={styles.reasonImg} />
					<Typography.Text className={styles.reasonText}>
						The trace data has not been rendered on your SigNoz server yet. You can
						wait for a bit and refresh this page if this is the case.
					</Typography.Text>
				</div>
				<div className={styles.reason}>
					<img src={broomUrl} alt="no-data" className={styles.reasonImg} />
					<Typography.Text className={styles.reasonText}>
						The trace has been deleted as the data has crossed it’s retention period.
					</Typography.Text>
				</div>
			</section>
			<section className={styles.noneOfAbove}>
				<Typography.Text className={styles.noneText}>
					If you feel the issue is none of the above, please contact support.
				</Typography.Text>
				<div className={styles.actionBtns}>
					<Button
						variant="outlined"
						color="secondary"
						className={styles.actionBtn}
						prefix={<RefreshCw size={14} />}
						onClick={(): void => window.location.reload()}
						testId="trace-no-data-refresh-button"
					>
						Refresh this page
					</Button>
					<Button
						variant="outlined"
						color="secondary"
						className={styles.actionBtn}
						prefix={<LifeBuoy size={14} />}
						onClick={(): void => handleContactSupport(isCloudUserVal)}
						testId="trace-no-data-contact-support-button"
					>
						Contact Support
					</Button>
				</div>
			</section>
		</div>
	);
}

export default NoData;
