import styled from 'styled-components';

interface InfinityWrapperStyledProps {
	$height?: number;
}

export const InfinityWrapperStyled = styled.div<InfinityWrapperStyledProps>`
	height: ${
		({ $height }): string =>
			$height !== undefined ? `${$height * 2.5}rem` : '40rem' // we are multiplying by 2.5 becuase it's a height of each log in the table.
	};
	max-height: 87vh;
	display: flex;
`;
