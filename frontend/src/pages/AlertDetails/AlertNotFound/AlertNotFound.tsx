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

import './AlertNotFound.styles.scss';

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
		<div className="alert-not-found">
			<section className="description">
				<img src={noDataUrl} alt="no-data" className="not-found-img" />
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="secondary"
					as="span"
					display="inline-block"
					align="center"
					textOverflow="wrap"
				>
					Uh-oh! We couldn&apos;t find the given alert rule.
				</Typography>
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="secondary"
					as="span"
					display="inline-block"
					align="center"
					textOverflow="wrap"
				>
					{isTestAlert
						? 'This can happen in the following scenario -'
						: 'This can happen in either of the following scenarios -'}
				</Typography>
			</section>
			<section className="reasons">
				{!isTestAlert && (
					<>
						<div className="reason">
							<img src={constructionUrl} alt="no-data" className="construction-img" />
							<Typography
								variant="paragraph"
								size="base"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								The alert rule link is incorrect, please verify it once.
							</Typography>
						</div>
						<div className="reason">
							<img src={broomUrl} alt="no-data" className="broom-img" />
							<Typography
								variant="paragraph"
								size="base"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								The alert rule you&apos;re trying to check has been deleted.
							</Typography>
						</div>
					</>
				)}
				{isTestAlert && (
					<div className="reason">
						<img src={broomUrl} alt="no-data" className="broom-img" />
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							You clicked on the Alert notification link received when testing a new
							Alert rule. Once the alert rule is saved, future notifications will link
							to actual alerts.
						</Typography>
					</div>
				)}
			</section>
			<section className="none-of-above">
				<Typography
					/* TODO(typography): not lifted from className: font-weight differs by parent (400 | 500) */ variant="paragraph"
					size="base"
					weight="regular"
					color="secondary"
					as="span"
					display="inline-block"
					align="center"
					textOverflow="wrap"
				>
					If you feel the issue is none of the above, please contact support.
				</Typography>
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
