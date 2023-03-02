export interface DropRuleHeader {
	id: string;
    name: string;
    status: string;
	priority: number;
	ruleType: 'ALWAYS_ON';
}

export default DropRuleHeader;
