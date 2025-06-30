package sqlschema

type Table struct {
	// The name of the table.
	Name string

	// The columns that the table contains.
	Columns []*Column

	// The primary key constraint that the table contains.
	PrimaryKeyConstraint *PrimaryKeyConstraint

	// The foreign key constraints that the table contains.
	ForeignKeyConstraints []*ForeignKeyConstraint
}

func (table *Table) ToDropSQL(fmter SQLFormatter) [][]byte {
	sql := []byte{}

	sql = append(sql, "DROP TABLE IF EXISTS "...)
	sql = fmter.AppendIdent(sql, table.Name)

	return [][]byte{sql}
}

func (table *Table) ToRenameSQL(fmter SQLFormatter, newName string) []byte {
	sql := []byte{}

	sql = append(sql, "ALTER TABLE "...)
	sql = fmter.AppendIdent(sql, table.Name)
	sql = append(sql, " RENAME TO "...)
	sql = fmter.AppendIdent(sql, newName)

	return sql
}

func (table *Table) ToDropCopyCreateSQL(fmter SQLFormatter) [][]byte {
	sql := [][]byte{}

	tempTable := &Table{
		Name:                  table.Name + "__temp",
		Columns:               table.Columns,
		PrimaryKeyConstraint:  table.PrimaryKeyConstraint,
		ForeignKeyConstraints: table.ForeignKeyConstraints,
	}

	sql = append(sql, tempTable.ToCreateSQL(fmter))

	columns := []byte{}
	for i, column := range table.Columns {
		if i > 0 {
			columns = append(columns, ", "...)
		}

		columns = fmter.AppendIdent(columns, column.Name)
	}

	insertIntoSelectSQL := []byte{}
	insertIntoSelectSQL = append(insertIntoSelectSQL, "INSERT INTO "...)
	insertIntoSelectSQL = fmter.AppendIdent(insertIntoSelectSQL, tempTable.Name)
	insertIntoSelectSQL = append(insertIntoSelectSQL, " ("...)

	insertIntoSelectSQL = append(insertIntoSelectSQL, columns...)
	insertIntoSelectSQL = append(insertIntoSelectSQL, ") SELECT "...)
	insertIntoSelectSQL = append(insertIntoSelectSQL, columns...)
	insertIntoSelectSQL = append(insertIntoSelectSQL, " FROM "...)
	insertIntoSelectSQL = fmter.AppendIdent(insertIntoSelectSQL, table.Name)

	sql = append(sql, insertIntoSelectSQL)
	sql = append(sql, table.ToDropSQL(fmter)...)
	sql = append(sql, tempTable.ToRenameSQL(fmter, table.Name))

	return sql
}

func (table *Table) ToDropConstraintSQL(fmter SQLFormatter, constraint Constraint) []byte {
	sql := []byte{}

	sql = append(sql, "ALTER TABLE "...)
	sql = fmter.AppendIdent(sql, table.Name)
	sql = append(sql, " DROP CONSTRAINT IF EXISTS "...)
	sql = fmter.AppendIdent(sql, constraint.Name())

	return sql
}

func (table *Table) ToCreateSQL(fmter SQLFormatter) []byte {
	sql := []byte{}

	sql = append(sql, "CREATE TABLE IF NOT EXISTS "...)

	sql = fmter.AppendIdent(sql, table.Name)
	sql = append(sql, " ("...)

	for i, column := range table.Columns {
		if i > 0 {
			sql = append(sql, ", "...)
		}

		sql = append(sql, column.ToDefinitionSQL(fmter)...)
	}

	sql = append(sql, ", "...)
	sql = append(sql, table.PrimaryKeyConstraint.ToDefinitionSQL(fmter)...)

	for _, constraint := range table.ForeignKeyConstraints {
		sql = append(sql, ", "...)
		sql = append(sql, constraint.ToDefinitionSQL(fmter)...)
	}

	sql = append(sql, ")"...)

	return sql
}
