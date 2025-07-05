package sqlitesqlschema

import (
	"github.com/SigNoz/signoz/pkg/sqlschema"
)

type tabled struct {
	fmtter sqlschema.Formatter
}

func newTabled(fmtter sqlschema.Formatter) sqlschema.TabledSQLSchema {
	return &tabled{
		fmtter: fmtter,
	}
}

func (tabled *tabled) AddColumn(table *sqlschema.Table, column *sqlschema.Column, val any) [][]byte {
	sqls := [][]byte{
		column.ToAddSQL(tabled.fmtter, table.Name),
		column.ToUpdateSQL(tabled.fmtter, table.Name, val),
	}

	if !column.Nullable {
		sqls = append(sqls, table.ToCreateTempInsertDropAlterSQL(tabled.fmtter)...)
	}

	return sqls
}

func (tabled *tabled) CreateIndex(index sqlschema.Index) [][]byte {
	return [][]byte{index.ToCreateSQL(tabled.fmtter)}
}

func (tabled *tabled) DropConstraint(table *sqlschema.Table, uniqueConstraints []*sqlschema.UniqueConstraint, constraint sqlschema.Constraint) [][]byte {
	indexSQLs := [][]byte{}
	foundUniqueConstraint := false

	for _, uniqueConstraint := range uniqueConstraints {
		if !constraint.Equals(uniqueConstraint) {
			indexSQLs = append(indexSQLs, uniqueConstraint.ToIndexSQL(tabled.fmtter, table.Name))
		} else {
			foundUniqueConstraint = true
		}
	}

	// If the unique constraint is found, we need to create a new table with the unique constraint removed and the remaining indexes preserved.
	if foundUniqueConstraint {
		return append(table.ToCreateTempInsertDropAlterSQL(tabled.fmtter), indexSQLs...)
	}

	clonedTable, found := table.DropConstraint(constraint)
	// If neither unique constraint nor table constraint is found, we return an empty slice since the constraint does not exist.
	if !found {
		return [][]byte{}
	}

	return append(clonedTable.ToCreateTempInsertDropAlterSQL(tabled.fmtter), indexSQLs...)
}
