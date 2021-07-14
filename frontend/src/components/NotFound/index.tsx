import React from "react";

import Button from "./styles/Button";
import Text from "./styles/Text";
import Container from "./styles/Container";
import TextContainer from "./styles/TextContainer";

import NotFoundImage from "Src/assets/NotFound";
import ROUTES from "Src/constants/routes";

const NotFound = (): JSX.Element => {
	return (
		<Container>
			<NotFoundImage />

			<TextContainer>
				<Text>Ah, seems like we reached a dead end!</Text>
				<Text>Page Not Found</Text>
			</TextContainer>

			<Button to={ROUTES.APPLICATION} tabIndex={0}>
				Return To Metrics Page
			</Button>
		</Container>
	);
};

export default NotFound;
