interface ICustomDropdownProps {
	menu: React.ReactElement;
}

export default function ClientSideQBSearchDropdown(
	props: ICustomDropdownProps,
): React.ReactElement {
	const { menu } = props;
	return <div className="">{menu}</div>;
}
