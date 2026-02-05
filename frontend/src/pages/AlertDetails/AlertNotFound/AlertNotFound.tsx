import { Button, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { LifeBuoy, List } from 'lucide-react';
import { handleContactSupport } from 'pages/Integrations/utils';

import './AlertNotFound.styles.scss';

interface AlertNotFoundProps {
	isTestAlert: boolean;
}

function AlertNotFound({ isTestAlert }: AlertNotFoundProps): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();
	const { safeNavigate } = useSafeNavigate();

	const checkAllRulesHandler = (): void => {
		safeNavigate(ROUTES.LIST_ALL_ALERT);
	};

	const contactSupportHandler = (): void => {
		handleContactSupport(isCloudUserVal);
	};

	return (
		<div className="alert-not-found">
			<section className="description">
				<img src="/Icons/no-data.svg" alt="no-data" className="not-found-img" />
				<Typography.Text className="not-found-text">
					Uh-oh! We couldn&apos;t find the given alert rule.
				</Typography.Text>
				<Typography.Text className="not-found-text">
					{isTestAlert
						? 'This can happen in the following scenario -'
						: 'This can happen in either of the following scenarios -'}
				</Typography.Text>
			</section>
			<section className="reasons">
				{!isTestAlert && (
					<>
						<div className="reason">
							<img
								src="/Icons/construction.svg"
								alt="no-data"
								className="construction-img"
							/>
							<Typography.Text className="text">
								The alert rule link is incorrect, please verify it once.
							</Typography.Text>
						</div>
						<div className="reason">
							<img src="/Icons/broom.svg" alt="no-data" className="broom-img" />
							<Typography.Text className="text">
								The alert rule you&apos;re trying to check has been deleted.
							</Typography.Text>
						</div>
					</>
				)}
				{isTestAlert && (
					<div className="reason">
						<img src="/Icons/broom.svg" alt="no-data" className="broom-img" />
						<Typography.Text className="text">
							You clicked on the Alert notification link received when testing a new
							Alert rule. Once the alert rule is saved, future notifications will link
							to actual alerts.
						</Typography.Text>
					</div>
				)}
			</section>
			<section className="none-of-above">
				<Typography.Text className="text">
					If you feel the issue is none of the above, please contact support.
				</Typography.Text>
				<div className="action-btns">
					<Button
						className="action-btn"
						icon={<List size={14} />}
						onClick={checkAllRulesHandler}
					>
						Check all rules
					</Button>
					<Button
						className="action-btn"
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
