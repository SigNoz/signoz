package sqlschema

type TableName string

type Table struct {
	// The name of the table.
	Name TableName

	// The columns that the table contains.
	Columns []*Column

	// The primary key constraint that the table contains.
	PrimaryKeyConstraint *PrimaryKeyConstraint

	// The foreign key constraints that the table contains.
	ForeignKeyConstraints []*ForeignKeyConstraint
}

func (table *Table) Clone() *Table {
	copyOfColumns := make([]*Column, len(table.Columns))
	copy(copyOfColumns, table.Columns)

	copyOfForeignKeyConstraints := make([]*ForeignKeyConstraint, len(table.ForeignKeyConstraints))
	copy(copyOfForeignKeyConstraints, table.ForeignKeyConstraints)

	return &Table{
		Name:                  table.Name,
		Columns:               copyOfColumns,
		PrimaryKeyConstraint:  table.PrimaryKeyConstraint,
		ForeignKeyConstraints: copyOfForeignKeyConstraints,
	}
}

func (table *Table) DropConstraint(constraint Constraint) (Constraint, bool) {
	var droppedConstraint Constraint
	found := false

	if table.PrimaryKeyConstraint != nil && constraint.Equals(table.PrimaryKeyConstraint) {
		droppedConstraint = table.PrimaryKeyConstraint
		table.PrimaryKeyConstraint = nil
		found = true
	}

	if constraint.Type() == ConstraintTypeForeignKey {
		for i, fkConstraint := range table.ForeignKeyConstraints {
			if constraint.Equals(fkConstraint) {
				droppedConstraint = fkConstraint
				table.ForeignKeyConstraints = append(table.ForeignKeyConstraints[:i], table.ForeignKeyConstraints[i+1:]...)
				found = true
				break
			}
		}
	}

	return droppedConstraint, found
}

func (table *Table) ToDropSQL(fmter SQLFormatter) []byte {
	sql := []byte{}

	sql = append(sql, "DROP TABLE IF EXISTS "...)
	sql = fmter.AppendIdent(sql, string(table.Name))

	return sql
}

func (table *Table) ToRenameSQL(fmter SQLFormatter, newName TableName) []byte {
	sql := []byte{}

	sql = append(sql, "ALTER TABLE "...)
	sql = fmter.AppendIdent(sql, string(table.Name))
	sql = append(sql, " RENAME TO "...)
	sql = fmter.AppendIdent(sql, string(newName))

	return sql
}

// Creates a temporary table with the same schema as the input table,
// inserts the data from the input table into the temporary table, drops the input table,
// and then renames the temporary table to the input table name.
//
// It creates constraints with the same name as the input table making it unfit for RDMS systems which will complain about duplicate constraints.
// It is only useful for SQLite.
func (table *Table) ToCreateTempInsertDropAlterSQL(fmter SQLFormatter) [][]byte {
	sql := [][]byte{}

	tempTable := table.Clone()
	tempTable.Name = table.Name + "__temp"

	if tempTable.PrimaryKeyConstraint != nil {
		tempTable.PrimaryKeyConstraint = tempTable.PrimaryKeyConstraint.Named(table.PrimaryKeyConstraint.Name(table.Name)).(*PrimaryKeyConstraint)
	}

	for i, constraint := range tempTable.ForeignKeyConstraints {
		tempTable.ForeignKeyConstraints[i] = constraint.Named(constraint.Name(table.Name)).(*ForeignKeyConstraint)
	}

	sql = append(sql, tempTable.ToCreateSQL(fmter))

	columns := []byte{}
	for i, column := range table.Columns {
		if i > 0 {
			columns = append(columns, ", "...)
		}

		columns = fmter.AppendIdent(columns, string(column.Name))
	}

	insertIntoSelectSQL := []byte{}
	insertIntoSelectSQL = append(insertIntoSelectSQL, "INSERT INTO "...)
	insertIntoSelectSQL = fmter.AppendIdent(insertIntoSelectSQL, string(tempTable.Name))
	insertIntoSelectSQL = append(insertIntoSelectSQL, " ("...)

	insertIntoSelectSQL = append(insertIntoSelectSQL, columns...)
	insertIntoSelectSQL = append(insertIntoSelectSQL, ") SELECT "...)
	insertIntoSelectSQL = append(insertIntoSelectSQL, columns...)
	insertIntoSelectSQL = append(insertIntoSelectSQL, " FROM "...)
	insertIntoSelectSQL = fmter.AppendIdent(insertIntoSelectSQL, string(table.Name))

	sql = append(sql, insertIntoSelectSQL)
	sql = append(sql, table.ToDropSQL(fmter))
	sql = append(sql, tempTable.ToRenameSQL(fmter, table.Name))

	return sql
}

func (table *Table) ToCreateSQL(fmter SQLFormatter) []byte {
	sql := []byte{}

	sql = append(sql, "CREATE TABLE IF NOT EXISTS "...)

	sql = fmter.AppendIdent(sql, string(table.Name))
	sql = append(sql, " ("...)

	for i, column := range table.Columns {
		if i > 0 {
			sql = append(sql, ", "...)
		}

		sql = append(sql, column.ToDefinitionSQL(fmter)...)
	}

	if table.PrimaryKeyConstraint != nil {
		sql = append(sql, ", "...)
		sql = append(sql, table.PrimaryKeyConstraint.ToDefinitionSQL(fmter, table.Name)...)
	}

	for _, constraint := range table.ForeignKeyConstraints {
		sql = append(sql, ", "...)
		sql = append(sql, constraint.ToDefinitionSQL(fmter, table.Name)...)
	}

	sql = append(sql, ")"...)

	return sql
}
