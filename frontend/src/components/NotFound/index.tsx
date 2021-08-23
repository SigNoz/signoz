import React from "react";

import { Button, Text, TextContainer, Container } from "./styles";

import NotFoundImage from "assets/NotFound";
import ROUTES from "constants/routes";

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
