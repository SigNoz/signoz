import styled from 'styled-components';

export const TitleWrapper = styled.span`
	.hover-reveal {
		visibility: hidden;
	}

	&:hover .hover-reveal {
		visibility: visible;
	}
`;
