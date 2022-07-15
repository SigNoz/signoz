import { CloseOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import CategoryHeading from 'components/Logs/CategoryHeading';
import React, { useRef, useState } from 'react';
import { useHoverDirty } from 'react-use';

import FieldKey from './FieldKey';
import {  QueryFieldContainer } from './styles';

function QueryField() {
	return (
		<QueryFieldContainer

		>
			<div style={{ flex: 3 }}>
				<FieldKey name="host_name" type="string" />
			</div>
			<div
				style={{
					flex: 1,
					display: 'flex',
					minWidth: 400,
					gap: '1rem',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Input style={{ flex: 1, minWidth: 100 }} />
				<Input style={{ flex: 'auto', minWidth: 200 }} />
				<Button
					icon={<CloseOutlined />}
					type="text"
					size="small"
				/>
			</div>
		</QueryFieldContainer>
	);
}

function QueryBuilder() {
	return (
		<div>
			<CategoryHeading>QUERY BUILDER</CategoryHeading>

			<QueryField />
			<QueryField />
		</div>
	);
}

export default QueryBuilder;
