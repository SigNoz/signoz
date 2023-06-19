import { Button, Typography } from 'antd';
import SomethingWentWrongAsset from 'assets/SomethingWentWrong';
import { Container } from 'components/NotFound/styles';
import ROUTES from 'constants/routes';
import history from 'lib/history';

function SomethingWentWrong(): JSX.Element {
	return (
		<Container>
			<SomethingWentWrongAsset />
			<Typography.Title level={3}>Oops! Something went wrong</Typography.Title>
			<Button
				type="primary"
				onClick={(): void => {
					history.push(ROUTES.APPLICATION);
				}}
			>
				Return to Services page
			</Button>
		</Container>
	);
}

export default SomethingWentWrong;
