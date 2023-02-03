/* eslint-disable no-template-curly-in-string */
import { Button, Divider, Form, Input, Modal, Typography } from 'antd';
import React from 'react';

import PiplinesSearchBar from '../SearchBar';
import { inputfiledName } from './utils';

function NewPipline({
	addPipeline,
	setNewAddPiplines,
}: {
	addPipeline: boolean;
	setNewAddPiplines: (b: boolean) => void;
}): JSX.Element {
	const [form] = Form.useForm();

	const validateMessages = {
		required: '${label} is required!',
		types: {
			email: '${label} is not a valid email!',
			number: '${label} is not a valid number!',
		},
		number: {
			range: '${label} must be between ${min} and ${max}',
		},
	};

	const onFinish = (): void => {
		console.log('finish');
	};

	return (
		<Modal
			title={<Typography.Title level={4}>Create Pipeline</Typography.Title>}
			centered
			open={addPipeline}
			onOk={(): void => setNewAddPiplines(false)}
			onCancel={(): void => setNewAddPiplines(false)}
			width={800}
			footer={[
				<Button key="back" onClick={(): void => setNewAddPiplines(false)}>
					Cancel
				</Button>,
				<Button
					key="submit"
					type="primary"
					onClick={(): void => setNewAddPiplines(false)}
				>
					Create
				</Button>,
			]}
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
				validateMessages={validateMessages}
			>
				{inputfiledName.map((i) => {
					if (i.id === 3) {
						return (
							<Form.Item
								name={['user', 'name']}
								label={i.fildName}
								key={i.id}
								rules={[{ required: true }]}
							>
								<Input.TextArea rows={2} placeholder={i.placeholder} maxLength={4} />
							</Form.Item>
						);
					}
					return (
						<Form.Item
							name={['user', 'description']}
							label={i.fildName}
							key={i.id}
							rules={[{ required: true }]}
						>
							<Input placeholder={i.placeholder} />
						</Form.Item>
					);
				})}
			</Form>
			<Divider plain />
		</Modal>
	);
}

export default NewPipline;
