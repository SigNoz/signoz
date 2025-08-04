import styled from 'styled-components';

export const TitleWrapper = styled.span`
	user-select: text !important;
	cursor: text;

	.hover-reveal {
		visibility: hidden;
	}

	&:hover .hover-reveal {
		visibility: visible;
	}
`;
