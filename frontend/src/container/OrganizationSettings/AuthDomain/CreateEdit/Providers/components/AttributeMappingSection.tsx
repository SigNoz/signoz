import { useCallback, useState } from 'react';
import { Input } from '@signozhq/input';
import { Collapse, Form, Tooltip } from 'antd';
import { ChevronDown, ChevronRight, CircleHelp } from 'lucide-react';

import './AttributeMappingSection.styles.scss';

interface AttributeMappingSectionProps {
	/** The form field name prefix for the attribute mapping configuration */
	fieldNamePrefix: string[];
	/** Whether the section is expanded (controlled mode) */
	isExpanded?: boolean;
	/** Callback when expand/collapse is toggled */
	onExpandChange?: (expanded: boolean) => void;
}

function AttributeMappingSection({
	fieldNamePrefix,
	isExpanded,
	onExpandChange,
}: AttributeMappingSectionProps): JSX.Element {
	// Support both controlled and uncontrolled modes
	const [internalExpanded, setInternalExpanded] = useState(false);
	const isControlled = isExpanded !== undefined;
	const expanded = isControlled ? isExpanded : internalExpanded;

	const handleCollapseChange = useCallback(
		(keys: string | string[]): void => {
			const newExpanded = Array.isArray(keys) ? keys.length > 0 : !!keys;
			if (isControlled && onExpandChange) {
				onExpandChange(newExpanded);
			} else {
				setInternalExpanded(newExpanded);
			}
		},
		[isControlled, onExpandChange],
	);

	const collapseActiveKey = expanded ? ['attribute-mapping'] : [];

	return (
		<div className="attribute-mapping-section">
			<Collapse
				bordered={false}
				activeKey={collapseActiveKey}
				onChange={handleCollapseChange}
				className="attribute-mapping-section__collapse"
				expandIcon={(): null => null}
			>
				<Collapse.Panel
					key="attribute-mapping"
					header={
						<div className="attribute-mapping-section__collapse-header">
							{!expanded ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
							<div className="attribute-mapping-section__collapse-header-text">
								<h4 className="attribute-mapping-section__section-title typography-label-base-600">
									Attribute Mapping (Advanced)
								</h4>
								<p className="attribute-mapping-section__section-description typography-paragraph-small-400">
									Configure how SAML assertion attributes from your Identity Provider map
									to SigNoz user attributes. Leave empty to use default values. Note:
									Email is always extracted from the NameID assertion.
								</p>
							</div>
						</div>
					}
				>
					<div className="attribute-mapping-section__content">
						{/* Name Attribute */}
						<div className="attribute-mapping-section__field-group">
							<label
								className="attribute-mapping-section__label typography-label-base-500"
								htmlFor="name-attribute"
							>
								Name Attribute
								<Tooltip title="The SAML attribute key that contains the user's display name. Default: 'name'">
									<CircleHelp
										size={14}
										className="attribute-mapping-section__label-icon"
									/>
								</Tooltip>
							</label>
							<Form.Item
								name={[...fieldNamePrefix, 'nameAttribute']}
								className="attribute-mapping-section__form-item"
							>
								<Input id="name-attribute" placeholder="name" />
							</Form.Item>
						</div>

						{/* Groups Attribute */}
						<div className="attribute-mapping-section__field-group">
							<label
								className="attribute-mapping-section__label typography-label-base-500"
								htmlFor="groups-attribute"
							>
								Groups Attribute
								<Tooltip title="The SAML attribute key that contains the user's group memberships. Used for role mapping. Default: 'groups'">
									<CircleHelp
										size={14}
										className="attribute-mapping-section__label-icon"
									/>
								</Tooltip>
							</label>
							<Form.Item
								name={[...fieldNamePrefix, 'groupsAttribute']}
								className="attribute-mapping-section__form-item"
							>
								<Input id="groups-attribute" placeholder="groups" />
							</Form.Item>
						</div>

						{/* Role Attribute */}
						<div className="attribute-mapping-section__field-group">
							<label
								className="attribute-mapping-section__label typography-label-base-500"
								htmlFor="role-attribute"
							>
								Role Attribute
								<Tooltip title="The SAML attribute key that contains the user's role directly from the IDP. Default: 'role'">
									<CircleHelp
										size={14}
										className="attribute-mapping-section__label-icon"
									/>
								</Tooltip>
							</label>
							<Form.Item
								name={[...fieldNamePrefix, 'roleAttribute']}
								className="attribute-mapping-section__form-item"
							>
								<Input id="role-attribute" placeholder="role" />
							</Form.Item>
						</div>
					</div>
				</Collapse.Panel>
			</Collapse>
		</div>
	);
}

export default AttributeMappingSection;
