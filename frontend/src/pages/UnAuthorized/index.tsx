import { useCallback } from 'react';
import { Space, Typography } from 'antd';
import UnAuthorized from 'assets/UnAuthorized';
import { Container } from 'components/NotFound/styles';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useQueryState } from 'nuqs';
import { handleContactSupport } from 'pages/Integrations/utils';

import { useAppContext } from '../../providers/App/App';
import { USER_ROLES } from '../../types/roles';

import './index.styles.scss';

function UnAuthorizePage(): JSX.Element {
	const [debugCurrentRole] = useQueryState('currentRole');
	const { user } = useAppContext();
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const userIsAnonymous =
		debugCurrentRole === USER_ROLES.ANONYMOUS ||
		user.role === USER_ROLES.ANONYMOUS;
	const mistakeMessage = userIsAnonymous
		? 'If you believe this is a mistake, please contact your administrator or'
		: 'Please contact your administrator.';

	const handleContactSupportClick = useCallback((): void => {
		handleContactSupport(isCloudUserVal);
	}, [isCloudUserVal]);

	return (
		<Container className="unauthorized-page">
			<Space align="center" direction="vertical">
				<UnAuthorized width={64} height={64} />
				<Typography.Title level={3}>Access Restricted</Typography.Title>

				<p className="unauthorized-page__description">
					It looks like you don&lsquo;t have permission to view this page. <br />
					{mistakeMessage}
					{userIsAnonymous ? (
						<Typography.Link
							className="contact-support-link"
							onClick={handleContactSupportClick}
						>
							{' '}
							reach out to us.
						</Typography.Link>
					) : null}
				</p>
			</Space>
		</Container>
	);
}

export default UnAuthorizePage;
