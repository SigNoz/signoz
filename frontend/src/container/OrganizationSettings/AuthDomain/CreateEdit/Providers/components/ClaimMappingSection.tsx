import { useCallback, useState } from 'react';
import { Input } from '@signozhq/input';
import { Collapse, Form, Tooltip } from 'antd';
import { ChevronDown, ChevronRight, CircleHelp } from 'lucide-react';

import './ClaimMappingSection.styles.scss';

interface ClaimMappingSectionProps {
	/** The form field name prefix for the claim mapping configuration */
	fieldNamePrefix: string[];
	/** Whether the section is expanded (controlled mode) */
	isExpanded?: boolean;
	/** Callback when expand/collapse is toggled */
	onExpandChange?: (expanded: boolean) => void;
}

function ClaimMappingSection({
	fieldNamePrefix,
	isExpanded,
	onExpandChange,
}: ClaimMappingSectionProps): JSX.Element {
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

	const collapseActiveKey = expanded ? ['claim-mapping'] : [];

	return (
		<div className="claim-mapping-section">
			<Collapse
				bordered={false}
				activeKey={collapseActiveKey}
				onChange={handleCollapseChange}
				className="claim-mapping-section__collapse"
				expandIcon={(): null => null}
			>
				<Collapse.Panel
					key="claim-mapping"
					header={
						<div className="claim-mapping-section__collapse-header">
							{!expanded ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
							<div className="claim-mapping-section__collapse-header-text">
								<h4 className="claim-mapping-section__section-title">
									Claim Mapping (Advanced)
								</h4>
								<p className="claim-mapping-section__section-description">
									Configure how claims from your Identity Provider map to SigNoz user
									attributes. Leave empty to use default values.
								</p>
							</div>
						</div>
					}
				>
					<div className="claim-mapping-section__content">
						{/* Email Claim */}
						<div className="claim-mapping-section__field-group">
							<label className="claim-mapping-section__label" htmlFor="email-claim">
								Email Claim
								<Tooltip title="The claim key that contains the user's email address. Default: 'email'">
									<CircleHelp size={14} className="claim-mapping-section__label-icon" />
								</Tooltip>
							</label>
							<Form.Item
								name={[...fieldNamePrefix, 'email']}
								className="claim-mapping-section__form-item"
							>
								<Input id="email-claim" placeholder="Email" />
							</Form.Item>
						</div>

						{/* Name Claim */}
						<div className="claim-mapping-section__field-group">
							<label className="claim-mapping-section__label" htmlFor="name-claim">
								Name Claim
								<Tooltip title="The claim key that contains the user's display name. Default: 'name'">
									<CircleHelp size={14} className="claim-mapping-section__label-icon" />
								</Tooltip>
							</label>
							<Form.Item
								name={[...fieldNamePrefix, 'name']}
								className="claim-mapping-section__form-item"
							>
								<Input id="name-claim" placeholder="Name" />
							</Form.Item>
						</div>

						{/* Groups Claim */}
						<div className="claim-mapping-section__field-group">
							<label className="claim-mapping-section__label" htmlFor="groups-claim">
								Groups Claim
								<Tooltip title="The claim key that contains the user's group memberships. Used for role mapping. Default: 'groups'">
									<CircleHelp size={14} className="claim-mapping-section__label-icon" />
								</Tooltip>
							</label>
							<Form.Item
								name={[...fieldNamePrefix, 'groups']}
								className="claim-mapping-section__form-item"
							>
								<Input id="groups-claim" placeholder="Groups" />
							</Form.Item>
						</div>

						{/* Role Claim */}
						<div className="claim-mapping-section__field-group">
							<label className="claim-mapping-section__label" htmlFor="role-claim">
								Role Claim
								<Tooltip title="The claim key that contains the user's role directly from the IDP. Default: 'role'">
									<CircleHelp size={14} className="claim-mapping-section__label-icon" />
								</Tooltip>
							</label>
							<Form.Item
								name={[...fieldNamePrefix, 'role']}
								className="claim-mapping-section__form-item"
							>
								<Input id="role-claim" placeholder="Role" />
							</Form.Item>
						</div>
					</div>
				</Collapse.Panel>
			</Collapse>
		</div>
	);
}

export default ClaimMappingSection;
