export type Format = {
	name: string;
	id: string;
};

export type Category = {
	name: string;
	formats: Format[];
};

export type DataTypeCategories = Category[];
