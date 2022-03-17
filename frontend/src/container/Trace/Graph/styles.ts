import styled, {
	css,
	DefaultTheme,
	ThemedCssFunction,
} from 'styled-components';

interface Props {
	center?: boolean;
}

export const Container = styled.div<Props>`
	height: 25vh;
	margin-top: 1rem;
	margin-bottom: 1rem;

	${({
		center,
	}: Props): ReturnType<ThemedCssFunction<DefaultTheme>> | false | undefined =>
		center &&
		css`
			display: flex;
			justify-content: center;
			align-items: center;
		`}
`;
