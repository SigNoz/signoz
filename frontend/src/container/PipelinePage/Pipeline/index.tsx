import { Button, Divider, Form, Input, Modal, Typography } from 'antd';
import React, { useMemo } from 'react';

import PiplinesSearchBar from '../SearchBar';
import { inputfieldName } from './utils';

function NewPipline({
	isActionType,
	setActionType,
	selectedRecord,
}: {
	isActionType: string | undefined;
	setActionType: (b: string | undefined) => void;
	selectedRecord: string;
}): JSX.Element {
	const [form] = Form.useForm();

	const isEdit = useMemo(() => isActionType === 'edit-pipeline', [isActionType]);
	const isAdd = useMemo(() => isActionType === 'add-pipeline', [isActionType]);

	const onFinish = (values: unknown): void => {
		console.log('onFinish-values:', values);
		setActionType(undefined);
	};

	return (
		<Modal
			title={
				<Typography.Title
					level={4}
					style={{
						fontStyle: 'normal',
						fontWeight: 600,
						fontSize: '18px',
						lineHeight: '24px',
					}}
				>
					{isEdit ? `Edit Pipeline : ${selectedRecord}` : 'Create New Pipeline'}
				</Typography.Title>
			}
			centered
			open={isEdit || isAdd}
			width={800}
			footer={null}
			onCancel={(): void => setActionType(undefined)}
		>
			<Divider plain />
			<div style={{ marginTop: '25px' }}>
				<span>Filter</span>
				<div style={{ marginTop: '5px' }}>
					<PiplinesSearchBar />
				</div>
			</div>
			<Form
				form={form}
				layout="vertical"
				style={{ marginTop: '20px' }}
				onFinish={onFinish}
			>
				{inputfieldName.map((i) => {
					if (i.id === 3) {
						return (
							<Form.Item name={i.fieldName} label={i.fieldName} key={i.id}>
								<Input.TextArea
									rows={3}
									name={i.fieldName}
									placeholder={
										isEdit ? 'This is a pipeline to edit wifi logs' : i.placeholder
									}
								/>
							</Form.Item>
						);
					}
					return (
						<Form.Item
							required={false}
							label={
								<span
									style={{
										fontSize: '12px',
										fontStyle: 'normal',
										fontWeight: 400,
										lineHeight: '20px',
									}}
								>
									{i.fieldName}
								</span>
							}
							key={i.id}
							rules={[
								{
									required: true,
								},
							]}
							name={i.fieldName}
						>
							<Input name={i.fieldName} placeholder={i.placeholder} />
						</Form.Item>
					);
				})}
				<Divider plain />
				<Form.Item>
					<div
						style={{ display: 'flex', flexDirection: 'row-reverse', gap: '10px' }}
					>
						<Button key="submit" type="primary" htmlType="submit">
							{isEdit ? 'Update' : 'Create'}
						</Button>
						<Button key="back" onClick={(): void => setActionType(undefined)}>
							Cancel
						</Button>
					</div>
				</Form.Item>
			</Form>
		</Modal>
	);
}

export default NewPipline;
