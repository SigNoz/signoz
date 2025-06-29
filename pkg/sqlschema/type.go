package sqlschema

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	DataTypeText      = DataType{s: valuer.NewString("TEXT")}
	DataTypeBigInt    = DataType{s: valuer.NewString("BIGINT")}
	DataTypeInteger   = DataType{s: valuer.NewString("INTEGER")}
	DataTypeNumeric   = DataType{s: valuer.NewString("NUMERIC")}
	DataTypeBoolean   = DataType{s: valuer.NewString("BOOLEAN")}
	DataTypeTimestamp = DataType{s: valuer.NewString("TIMESTAMP")}
)

type DataType struct{ s valuer.String }

func (d DataType) String() string {
	return d.s.String()
}

var (
	ConstraintTypePrimaryKey = ConstraintType{s: valuer.NewString("pk")}
	ConstraintTypeForeignKey = ConstraintType{s: valuer.NewString("fk")}
	ConstraintTypeCheck      = ConstraintType{s: valuer.NewString("ck")}
	ConstraintTypeUnique     = ConstraintType{s: valuer.NewString("uq")}
)

type ConstraintType struct{ s valuer.String }

func (c ConstraintType) String() string {
	return c.s.String()
}

var (
	IndexTypeUnique = IndexType{s: valuer.NewString("uq")}
	IndexTypeIndex  = IndexType{s: valuer.NewString("ix")}
)

type IndexType struct{ s valuer.String }

func (i IndexType) String() string {
	return i.s.String()
}
