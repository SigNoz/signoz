import { Card } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	&&& {
		max-width: 80%;
		margin: 2rem auto;
	}
`;

export const MonocoEditor = styled.div`
	min-height: 50vh;
`;
