import { Space, Typography } from 'antd';
import UnAuthorized from 'assets/UnAuthorized';
import { Button, Container } from 'components/NotFound/styles';
import ROUTES from 'constants/routes';

function UnAuthorizePage(): JSX.Element {
	return (
		<Container>
			<Space align="center" direction="vertical">
				<UnAuthorized />
				<Typography.Title level={3}>
					Oops.. you don&apos;t have permission to view this page
				</Typography.Title>
				<Button to={ROUTES.APPLICATION} tabIndex={0}>
					Return To Services Page
				</Button>
			</Space>
		</Container>
	);
}

export default UnAuthorizePage;
