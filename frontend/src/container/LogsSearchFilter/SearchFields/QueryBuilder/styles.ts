import styled from 'styled-components';

interface Props {
	isMargin: boolean;
}
export const Container = styled.div<Props>`
	display: flex;
	justify-content: space-between;
	width: 100%;
	margin-bottom: ${(props): string => (props.isMargin ? '2rem' : '0')};
`;
