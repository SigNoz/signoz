import { useCallback } from 'react';
import { Space } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import UnAuthorized from 'assets/UnAuthorized';
import { Container } from 'components/NotFound/styles';
import { handleContactSupport } from 'container/Integrations/utils';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useQueryState } from 'nuqs';

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
				<Typography
					variant="label"
					size="large"
					weight="bold"
					color="inherit"
					as="h3"
					marginY={4}
					textOverflow="wrap"
				>
					Access Restricted
				</Typography>

				<p className="unauthorized-page__description">
					It looks like you don&lsquo;t have permission to view this page. <br />
					{mistakeMessage}
					{userIsAnonymous ? (
						<Button
							variant="link"
							color="primary"
							size="md"
							onClick={handleContactSupportClick}
						>
							{' '}
							reach out to us.
						</Button>
					) : null}
				</p>
			</Space>
		</Container>
	);
}

export default UnAuthorizePage;
