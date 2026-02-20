import { Button } from '@signozhq/button';
import { Plus, Trash2 } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { Form } from 'antd';

import './DomainMappingList.styles.scss';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (_: unknown, value: string): Promise<void> => {
	if (!value) {
		return Promise.reject(new Error('Admin email is required'));
	}
	if (!EMAIL_REGEX.test(value)) {
		return Promise.reject(new Error('Please enter a valid email'));
	}
	return Promise.resolve();
};

interface DomainMappingListProps {
	fieldNamePrefix: string[];
}

function DomainMappingList({
	fieldNamePrefix,
}: DomainMappingListProps): JSX.Element {
	return (
		<div className="domain-mapping-list">
			<div className="domain-mapping-list__header">
				<span className="domain-mapping-list__title">
					Domain to Admin Email Mapping
				</span>
				<p className="domain-mapping-list__description">
					Map workspace domains to admin emails for service account impersonation.
					Use &quot;*&quot; as a wildcard for any domain.
				</p>
			</div>

			<Form.List name={fieldNamePrefix}>
				{(fields, { add, remove }): JSX.Element => (
					<div className="domain-mapping-list__items">
						{fields.map((field) => (
							<div key={field.key} className="domain-mapping-list__row">
								<Form.Item
									name={[field.name, 'domain']}
									className="domain-mapping-list__field"
									rules={[{ required: true, message: 'Domain is required' }]}
								>
									<Input placeholder="Domain (e.g., example.com or *)" />
								</Form.Item>

								<Form.Item
									name={[field.name, 'adminEmail']}
									className="domain-mapping-list__field"
									rules={[{ validator: validateEmail }]}
								>
									<Input placeholder="Admin Email" />
								</Form.Item>

								<Button
									variant="ghost"
									color="secondary"
									className="domain-mapping-list__remove-btn"
									onClick={(): void => remove(field.name)}
									aria-label="Remove mapping"
								>
									<Trash2 size={12} />
								</Button>
							</div>
						))}

						<Button
							variant="dashed"
							onClick={(): void => add({ domain: '', adminEmail: '' })}
							prefixIcon={<Plus size={14} />}
							className="domain-mapping-list__add-btn"
						>
							Add Domain Mapping
						</Button>
					</div>
				)}
			</Form.List>
		</div>
	);
}

export default DomainMappingList;
