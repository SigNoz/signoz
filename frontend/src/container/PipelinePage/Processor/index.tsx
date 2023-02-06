import {
	Avatar,
	Button,
	Divider,
	Form,
	Input,
	Modal,
	Select as DefaultSelect,
	Typography,
} from 'antd';
import React from 'react';

import { modalIcon, modalIconStyle } from '../config';
import { wrapperStyle } from './config';
import { grokProcessorInputFild, items } from './utils';

function NewProcessor({
	isActionType,
	setActionType,
}: {
	isActionType: string | undefined;
	setActionType: (b: string | undefined) => void;
}): JSX.Element {
	const { Option } = DefaultSelect;
	const [form] = Form.useForm();

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
					{isActionType === 'edit'
						? `Edit <Add something>`
						: 'Create Grok Processor'}
				</Typography.Title>
			}
			centered
			open={isActionType === 'edit' || isActionType === 'add'}
			width={800}
			footer={null}
			onCancel={(): void => setActionType(undefined)}
		>
			<Divider plain />
			<div style={{ marginTop: '20px' }}>
				<div style={{ display: 'flex', gap: '20px' }}>
					<Avatar size="small" style={modalIcon}>
						1
					</Avatar>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '10px',
							marginTop: '10px',
						}}
					>
						<span>Select Processor Type </span>
						<DefaultSelect
							labelInValue
							style={{ width: 200 }}
							defaultValue={{ value: 'Grok Processor', label: 'Grok Processor' }}
						>
							{items.map(({ value, label }) => (
								<Option key={value + label} value={value}>
									{label}
								</Option>
							))}
						</DefaultSelect>
					</div>
				</div>
				<Form
					form={form}
					layout="vertical"
					style={{ marginTop: '20px' }}
					onFinish={onFinish}
				>
					{grokProcessorInputFild.map((i, index) => {
						if (i.id === 1) {
							return (
								<div key={i.id + Math.random()} style={wrapperStyle}>
									<Avatar size="small" style={modalIconStyle}>
										{index + 2}
									</Avatar>
									<div style={{ width: '100%' }}>
										<Form.Item
											required={false}
											label={
												<span
													style={{
														fontStyle: 'normal',
														fontWeight: 400,
														fontSize: '12px',
														lineHeight: '20px',
													}}
												>
													{i.fildName}
												</span>
											}
											name={i.fildName}
											key={i.id}
											rules={[
												{
													required: true,
												},
											]}
										>
											<Input placeholder={i.placeholder} name={i.fildName} />
										</Form.Item>
									</div>
								</div>
							);
						}
						return (
							<div key={i.id + Math.random()} style={wrapperStyle}>
								<Avatar size="small" style={modalIconStyle}>
									{index + 2}
								</Avatar>
								<div style={{ width: '100%' }}>
									<Form.Item
										label={
											<span
												style={{
													fontStyle: 'normal',
													fontWeight: 400,
													fontSize: '12px',
													lineHeight: '20px',
												}}
											>
												{i.fildName}
											</span>
										}
									>
										<Input.TextArea rows={4} placeholder={i.placeholder} />
									</Form.Item>
								</div>
							</div>
						);
					})}
					<Divider plain />
					<Form.Item>
						<div
							style={{ display: 'flex', flexDirection: 'row-reverse', gap: '10px' }}
						>
							<Button key="submit" type="primary" htmlType="submit">
								{isActionType === 'edit' ? 'Update' : 'Create'}
							</Button>
							<Button key="back" onClick={(): void => setActionType('')}>
								Cancel
							</Button>
						</div>
					</Form.Item>
				</Form>
			</div>
		</Modal>
	);
}

export default NewProcessor;
