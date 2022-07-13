import { Typography } from 'antd';
import styled from 'styled-components';

export const Span = styled(Typography.Paragraph)`
	&&& {
		font-size: 0.75rem;
		margin: 0;
		/* border-bottom: 1px solid grey; */
	}
`;

export const Service = styled(Typography.Paragraph)`
	&&& {
		color: #acacac;
		font-size: 0.75rem;
	}
`;

export const SpanWrapper = styled.div`
	display: flex;
	flex-direction: column;
	margin-left: 0.625rem;
	width: 10rem;
`;

export const SpanConnector = styled.div`
	width: 37px;
	border: 1px solid #303030;
	height: 0;
`;

export const Container = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
`;

export const SpanName = styled.div`
	width: fit-content;
	border-bottom: 1px solid black;
`;
