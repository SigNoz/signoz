const paramsInObject = (params: URLSearchParams): { [x: string]: string } => {
	const updatedParamas: { [x: string]: string } = {};
	params.forEach((value, key) => {
		updatedParamas[key] = value;
	});
	return updatedParamas;
};

export default paramsInObject;
