import { Typography } from 'antd';
import styled from 'styled-components';

export const Span = styled(Typography.Paragraph)`
	&&& {
		font-size: 0.75rem;
		margin: 0;
	}
`;

export const Service = styled(Typography)`
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

export const Container = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
`;
