import React, { useCallback } from "react";
import { useHistory } from "react-router-dom";

import Button from "./styles/Button";
import Text from "./styles/Text";
import Container from "./styles/Container";
import ButtonContainer from "./styles/ButtonContainer";
import TextContainer from "./styles/TextContainer";

import NotFoundImage from "Src/assets/NotFound";
import ROUTES from "Src/constants/routes";

const NotFound = (): JSX.Element => {
	const { push } = useHistory();

	const onClickHandler = useCallback(() => {
		push(ROUTES.APPLICATION);
	}, []);

	return (
		<Container>
			<NotFoundImage />

			<TextContainer>
				<Text>Ah, seems like we reached a dead end!</Text>
				<Text>Page Not Found</Text>
			</TextContainer>

			<ButtonContainer>
				<Button tabIndex={0} onClick={onClickHandler}>
					Return To Metrics Page
				</Button>
			</ButtonContainer>
		</Container>
	);
};

export default NotFound;
