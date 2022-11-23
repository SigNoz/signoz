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

export const QueryWrapper = styled.div`
	display: grid;
	grid-template-columns: 80px 1fr;
	margin: 0.5rem 0px;
`;
