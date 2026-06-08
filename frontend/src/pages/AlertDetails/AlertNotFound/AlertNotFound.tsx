import React from 'react';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import ROUTES from 'constants/routes';
import { handleContactSupport } from 'container/Integrations/utils';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { LifeBuoy, List } from '@signozhq/icons';
import { isModifierKeyPressed } from 'utils/app';

import broomUrl from '@/assets/Icons/broom.svg';
import constructionUrl from '@/assets/Icons/construction.svg';
import noDataUrl from '@/assets/Icons/no-data.svg';

import styles from './AlertNotFound.module.scss';

interface AlertNotFoundProps {
	isTestAlert: boolean;
}

function AlertNotFound({ isTestAlert }: AlertNotFoundProps): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();
	const { safeNavigate } = useSafeNavigate();

	const checkAllRulesHandler = (e: React.MouseEvent): void => {
		safeNavigate(ROUTES.LIST_ALL_ALERT, { newTab: isModifierKeyPressed(e) });
	};

	const contactSupportHandler = (): void => {
		handleContactSupport(isCloudUserVal);
	};

	return (
		<div className={styles.alertNotFound}>
			<section className={styles.description}>
				<img src={noDataUrl} alt="no-data" className={styles.notFoundImg} />
				<Typography.Text className={styles.notFoundText}>
					Uh-oh! We couldn&apos;t find the given alert rule.
				</Typography.Text>
				<Typography.Text className={styles.notFoundText}>
					{isTestAlert
						? 'This can happen in the following scenario -'
						: 'This can happen in either of the following scenarios -'}
				</Typography.Text>
			</section>
			<section className={styles.reasons}>
				{!isTestAlert && (
					<>
						<div className={styles.reason}>
							<img
								src={constructionUrl}
								alt="no-data"
								className={styles.constructionImg}
							/>
							<Typography.Text className={styles.reasonText}>
								The alert rule link is incorrect, please verify it once.
							</Typography.Text>
						</div>
						<div className={styles.reason}>
							<img src={broomUrl} alt="no-data" className={styles.broomImg} />
							<Typography.Text className={styles.reasonText}>
								The alert rule you&apos;re trying to check has been deleted.
							</Typography.Text>
						</div>
					</>
				)}
				{isTestAlert && (
					<div className={styles.reason}>
						<img src={broomUrl} alt="no-data" className={styles.broomImg} />
						<Typography.Text className={styles.reasonText}>
							You clicked on the Alert notification link received when testing a new
							Alert rule. Once the alert rule is saved, future notifications will link
							to actual alerts.
						</Typography.Text>
					</div>
				)}
			</section>
			<section className={styles.noneOfAbove}>
				<Typography.Text className={styles.noneOfAboveText}>
					If you feel the issue is none of the above, please contact support.
				</Typography.Text>
				<div className={styles.actionBtns}>
					<Button
						className={styles.actionBtn}
						icon={<List size={14} />}
						onClick={checkAllRulesHandler}
					>
						Check all rules
					</Button>
					<Button
						className={styles.actionBtn}
						icon={<LifeBuoy size={14} />}
						onClick={contactSupportHandler}
					>
						Contact Support
					</Button>
				</div>
			</section>
		</div>
	);
}

export default AlertNotFound;
