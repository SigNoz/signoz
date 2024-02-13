function UplotBar({ title }: UplotBarProps): JSX.Element {
	console.log(' Running', title);
	return <div style={{ color: 'white' }}>UplotBar</div>;
}

UplotBar.defaultProps = {
	title: '',
};

export type UplotBarProps = {
	title?: string;
};

export default UplotBar;
