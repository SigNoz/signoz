package sqlschema

var _ SQLOperator = (*Operator)(nil)

type OperatorSupport struct {
	DropConstraint          bool
	ColumnIfNotExistsExists bool
	AlterColumnSetNotNull   bool
}

type Operator struct {
	fmter   SQLFormatter
	support OperatorSupport
}

func NewOperator(fmter SQLFormatter, support OperatorSupport) *Operator {
	return &Operator{
		fmter:   fmter,
		support: support,
	}
}

func (operator *Operator) CreateTable(table *Table) [][]byte {
	return [][]byte{table.ToCreateSQL(operator.fmter)}
}

func (operator *Operator) RenameTable(table *Table, newName TableName) [][]byte {
	table.Name = newName
	return [][]byte{table.ToRenameSQL(operator.fmter, newName)}
}

func (operator *Operator) RecreateTable(table *Table, uniqueConstraints []*UniqueConstraint) [][]byte {
	sqls := [][]byte{}

	sqls = append(sqls, table.ToCreateTempInsertDropAlterSQL(operator.fmter)...)

	for _, uniqueConstraint := range uniqueConstraints {
		sqls = append(sqls, uniqueConstraint.ToIndex(table.Name).ToCreateSQL(operator.fmter))
	}

	return sqls
}

func (operator *Operator) DropTable(table *Table) [][]byte {
	return [][]byte{table.ToDropSQL(operator.fmter)}
}

func (operator *Operator) CreateIndex(index Index) [][]byte {
	return [][]byte{index.ToCreateSQL(operator.fmter)}
}

func (operator *Operator) DropIndex(index Index) [][]byte {
	return [][]byte{index.ToDropSQL(operator.fmter)}
}

func (operator *Operator) AddColumn(table *Table, uniqueConstraints []*UniqueConstraint, column *Column, val any) [][]byte {
	// If the column already exists, we do not need to add it.
	if index := operator.findColumnByName(table, column.Name); index != -1 {
		return [][]byte{}
	}

	// Add the column to the table.
	table.Columns = append(table.Columns, column)

	sqls := [][]byte{
		column.ToAddSQL(operator.fmter, table.Name, operator.support.ColumnIfNotExistsExists),
	}

	if !column.Nullable {
		if val == nil {
			val = column.DataType.z
		}
		sqls = append(sqls, column.ToUpdateSQL(operator.fmter, table.Name, val))

		if operator.support.AlterColumnSetNotNull {
			sqls = append(sqls, column.ToSetNotNullSQL(operator.fmter, table.Name))
		} else {
			sqls = append(sqls, operator.RecreateTable(table, uniqueConstraints)...)
		}
	}

	return sqls
}

func (operator *Operator) DropColumn(table *Table, column *Column) [][]byte {
	index := operator.findColumnByName(table, column.Name)
	// If the column does not exist, we do not need to drop it.
	if index == -1 {
		return [][]byte{}
	}

	table.Columns = append(table.Columns[:index], table.Columns[index+1:]...)

	return [][]byte{column.ToDropSQL(operator.fmter, table.Name, operator.support.ColumnIfNotExistsExists)}
}

func (operator *Operator) DropConstraint(table *Table, uniqueConstraints []*UniqueConstraint, constraint Constraint) [][]byte {
	// The name of the input constraint is not guaranteed to be the same as the name of the constraint in the database.
	// So we need to find the constraint in the database and drop it.
	toDropConstraint, found := table.DropConstraint(constraint)
	if !found {
		uniqueConstraintIndex := operator.findUniqueConstraint(uniqueConstraints, constraint)
		if uniqueConstraintIndex == -1 {
			return [][]byte{}
		}

		if operator.support.DropConstraint {
			return [][]byte{uniqueConstraints[uniqueConstraintIndex].ToDropSQL(operator.fmter, table.Name)}
		}

		return operator.RecreateTable(table, append(uniqueConstraints[:uniqueConstraintIndex], uniqueConstraints[uniqueConstraintIndex+1:]...))
	}

	if operator.support.DropConstraint {
		return [][]byte{toDropConstraint.ToDropSQL(operator.fmter, table.Name)}
	}

	return operator.RecreateTable(table, uniqueConstraints)
}

func (*Operator) findColumnByName(table *Table, columnName ColumnName) int {
	for i, column := range table.Columns {
		if column.Name == columnName {
			return i
		}
	}

	return -1
}

func (*Operator) findUniqueConstraint(uniqueConstraints []*UniqueConstraint, constraint Constraint) int {
	if constraint.Type() != ConstraintTypeUnique {
		return -1
	}

	for i, uniqueConstraint := range uniqueConstraints {
		if uniqueConstraint.Equals(constraint) {
			return i
		}
	}

	return -1
}
