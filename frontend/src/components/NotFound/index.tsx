import NotFoundImage from 'assets/NotFound';
import ROUTES from 'constants/routes';

import { defaultText } from './constant';
import { Button, Container, Text, TextContainer } from './styles';

function NotFound({ text = defaultText }: Props): JSX.Element {
	return (
		<Container>
			<NotFoundImage />

			<TextContainer>
				<Text>{text}</Text>
				<Text>Page Not Found</Text>
			</TextContainer>

			<Button to={ROUTES.HOME} tabIndex={0}>
				Return Home
			</Button>
		</Container>
	);
}

interface Props {
	text?: string;
}

NotFound.defaultProps = {
	text: defaultText,
};

export default NotFound;
