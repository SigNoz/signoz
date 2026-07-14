package sqlschema

import (
	"reflect"
	"slices"
)

var _ SQLOperator = (*Operator)(nil)

type OperatorSupport struct {
	// Support for creating and dropping constraints.
	SCreateAndDropConstraint bool

	// Support for `IF EXISTS` and `IF NOT EXISTS` in `ALTER TABLE ADD COLUMN` and `ALTER TABLE DROP COLUMN`.
	SAlterTableAddAndDropColumnIfNotExistsAndExists bool

	// Support for altering columns such as `ALTER TABLE ALTER COLUMN SET NOT NULL`.
	SAlterTableAlterColumnSetAndDrop bool
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
	sql := table.ToRenameSQL(operator.fmter, newName)
	table.Name = newName

	return [][]byte{sql}
}

func (operator *Operator) AlterTable(oldTable *Table, oldTableUniqueConstraints []*UniqueConstraint, newTable *Table) [][]byte {
	// The following has to be done in order:
	// 		- Drop constraints
	// 		- Drop columns (some columns might be part of constraints therefore this depends on Step 1)
	// 		- Add columns, then modify columns
	// 		- Rename table
	// 		- Add constraints (some constraints might be part of columns therefore this depends on Step 3, constraint names also depend on table name which is changed in Step 4)
	// 		- Create unique indices from unique constraints for the new table

	sql := [][]byte{}

	// Drop primary key constraint if it is in the old table but not in the new table.
	if oldTable.PrimaryKeyConstraint != nil && newTable.PrimaryKeyConstraint == nil {
		sql = append(sql, operator.DropConstraint(oldTable, oldTableUniqueConstraints, oldTable.PrimaryKeyConstraint)...)
	}

	// Drop primary key constraint if it is in the old table and the new table but they are different.
	if oldTable.PrimaryKeyConstraint != nil && newTable.PrimaryKeyConstraint != nil && !oldTable.PrimaryKeyConstraint.Equals(newTable.PrimaryKeyConstraint) {
		sql = append(sql, operator.DropConstraint(oldTable, oldTableUniqueConstraints, oldTable.PrimaryKeyConstraint)...)
	}

	// Drop foreign key constraints that are in the old table but not in the new table.
	for _, fkConstraint := range oldTable.ForeignKeyConstraints {
		if index := operator.findForeignKeyConstraint(newTable, fkConstraint); index == -1 {
			sql = append(sql, operator.DropConstraint(oldTable, oldTableUniqueConstraints, fkConstraint)...)
		}
	}

	// Drop all unique constraints.
	for _, uniqueConstraint := range oldTableUniqueConstraints {
		sql = append(sql, operator.DropConstraint(oldTable, oldTableUniqueConstraints, uniqueConstraint)...)
	}

	// Reduce number of drops for engines with no SCreateAndDropConstraint.
	if !operator.support.SCreateAndDropConstraint && len(sql) > 0 {
		// Do not send the unique constraints to recreate table. We will change them to indexes at the end.
		sql = operator.RecreateTable(oldTable, nil)
	}

	// Drop columns that are in the old table but not in the new table.
	for _, column := range oldTable.Columns {
		if index := operator.findColumnByName(newTable, column.Name); index == -1 {
			sql = append(sql, operator.DropColumn(oldTable, column)...)
		}
	}

	// Add columns that are in the new table but not in the old table.
	for _, column := range newTable.Columns {
		if index := operator.findColumnByName(oldTable, column.Name); index == -1 {
			sql = append(sql, operator.AddColumn(oldTable, oldTableUniqueConstraints, column, nil)...)
		}
	}

	// Modify columns that are in the new table and in the old table
	alterColumnSQLs := [][]byte{}
	for _, column := range newTable.Columns {
		alterColumnSQLs = append(alterColumnSQLs, operator.AlterColumn(oldTable, oldTableUniqueConstraints, column)...)
	}

	// Reduce number of drops for engines with no SAlterTableAlterColumnSetAndDrop.
	if !operator.support.SAlterTableAlterColumnSetAndDrop && len(alterColumnSQLs) > 0 {
		// Do not send the unique constraints to recreate table. We will change them to indexes at the end.
		sql = append(sql, operator.RecreateTable(oldTable, nil)...)
	}

	if operator.support.SAlterTableAlterColumnSetAndDrop && len(alterColumnSQLs) > 0 {
		sql = append(sql, alterColumnSQLs...)
	}

	// Check if the name has changed
	if oldTable.Name != newTable.Name {
		sql = append(sql, operator.RenameTable(oldTable, newTable.Name)...)
	}

	// If the old table does not have a primary key constraint and the new table does, we need to create it.
	if oldTable.PrimaryKeyConstraint == nil {
		if newTable.PrimaryKeyConstraint != nil {
			sql = append(sql, operator.CreateConstraint(oldTable, oldTableUniqueConstraints, newTable.PrimaryKeyConstraint)...)
		}
	}

	if oldTable.PrimaryKeyConstraint != nil {
		if !oldTable.PrimaryKeyConstraint.Equals(newTable.PrimaryKeyConstraint) {
			sql = append(sql, operator.CreateConstraint(oldTable, oldTableUniqueConstraints, newTable.PrimaryKeyConstraint)...)
		}
	}

	// Create foreign key constraints that are in the new table but not in the old table.
	for _, fkConstraint := range newTable.ForeignKeyConstraints {
		if index := operator.findForeignKeyConstraint(oldTable, fkConstraint); index == -1 {
			sql = append(sql, operator.CreateConstraint(oldTable, oldTableUniqueConstraints, fkConstraint)...)
		}
	}

	// Create indices for the new table.
	for _, uniqueConstraint := range oldTableUniqueConstraints {
		sql = append(sql, uniqueConstraint.ToIndex(oldTable.Name).ToCreateSQL(operator.fmter))
	}

	// Remove duplicate SQLs.
	return slices.CompactFunc(sql, func(a, b []byte) bool {
		return string(a) == string(b)
	})
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
		column.ToAddSQL(operator.fmter, table.Name, operator.support.SAlterTableAddAndDropColumnIfNotExistsAndExists),
	}

	// If the value is not nil, always try to update the column.
	if val != nil {
		sqls = append(sqls, column.ToUpdateSQL(operator.fmter, table.Name, val))
	}

	// If the column is not nullable and does not have a default value and no value is provided, we need to set something.
	// So we set it to the zero value of the column's data type.
	if !column.Nullable && column.Default == "" && val == nil {
		sqls = append(sqls, column.ToUpdateSQL(operator.fmter, table.Name, column.DataType.z))
	}

	// If the column is not nullable, we need to set it to not null.
	if !column.Nullable {
		if operator.support.SAlterTableAlterColumnSetAndDrop {
			sqls = append(sqls, column.ToSetNotNullSQL(operator.fmter, table.Name))
		} else {
			sqls = append(sqls, operator.RecreateTable(table, uniqueConstraints)...)
		}
	}

	return sqls
}

func (operator *Operator) AlterColumn(table *Table, uniqueConstraints []*UniqueConstraint, column *Column) [][]byte {
	index := operator.findColumnByName(table, column.Name)
	// If the column does not exist, we do not need to alter it.
	if index == -1 {
		return [][]byte{}
	}

	oldColumn := table.Columns[index]
	// If the column is the same, we do not need to alter it.
	if oldColumn.Equals(column) {
		return [][]byte{}
	}

	sqls := [][]byte{}
	var recreateTable bool

	if oldColumn.DataType != column.DataType {
		if operator.support.SAlterTableAlterColumnSetAndDrop {
			sqls = append(sqls, column.ToSetDataTypeSQL(operator.fmter, table.Name))
		} else {
			recreateTable = true
		}
	}

	if oldColumn.Nullable != column.Nullable {
		if operator.support.SAlterTableAlterColumnSetAndDrop {
			if column.Nullable {
				sqls = append(sqls, column.ToDropNotNullSQL(operator.fmter, table.Name))
			} else {
				sqls = append(sqls, column.ToSetNotNullSQL(operator.fmter, table.Name))
			}
		} else {
			recreateTable = true
		}
	}

	if oldColumn.Default != column.Default {
		if operator.support.SAlterTableAlterColumnSetAndDrop {
			if column.Default != "" {
				sqls = append(sqls, column.ToSetDefaultSQL(operator.fmter, table.Name))
			} else {
				sqls = append(sqls, column.ToDropDefaultSQL(operator.fmter, table.Name))
			}
		} else {
			recreateTable = true
		}
	}

	table.Columns[index] = column
	if recreateTable {
		sqls = append(sqls, operator.RecreateTable(table, uniqueConstraints)...)
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

	return [][]byte{column.ToDropSQL(operator.fmter, table.Name, operator.support.SAlterTableAddAndDropColumnIfNotExistsAndExists)}
}

func (operator *Operator) CreateConstraint(table *Table, uniqueConstraints []*UniqueConstraint, constraint Constraint) [][]byte {
	if constraint == nil {
		return [][]byte{}
	}

	if reflect.ValueOf(constraint).IsNil() {
		return [][]byte{}
	}

	if constraint.Type() == ConstraintTypeForeignKey {
		// Constraint already exists as foreign key constraint.
		if table.ForeignKeyConstraints != nil {
			for _, fkConstraint := range table.ForeignKeyConstraints {
				if constraint.Equals(fkConstraint) {
					return [][]byte{}
				}
			}
		}

		table.ForeignKeyConstraints = append(table.ForeignKeyConstraints, constraint.(*ForeignKeyConstraint))
	}

	sqls := [][]byte{}
	if constraint.Type() == ConstraintTypePrimaryKey {
		if operator.support.SCreateAndDropConstraint {
			if table.PrimaryKeyConstraint != nil {
				// TODO(grandwizard28): this is a hack to drop the primary key constraint.
				// We need to find a better way to do this.
				sqls = append(sqls, table.PrimaryKeyConstraint.ToDropSQL(operator.fmter, table.Name))
			}
		}
		table.PrimaryKeyConstraint = constraint.(*PrimaryKeyConstraint)
	}

	if operator.support.SCreateAndDropConstraint {
		return append(sqls, constraint.ToCreateSQL(operator.fmter, table.Name))
	}

	return operator.RecreateTable(table, uniqueConstraints)
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

		if operator.support.SCreateAndDropConstraint {
			return [][]byte{uniqueConstraints[uniqueConstraintIndex].ToDropSQL(operator.fmter, table.Name)}
		}

		var copyOfUniqueConstraints []*UniqueConstraint
		copyOfUniqueConstraints = append(copyOfUniqueConstraints, uniqueConstraints[:uniqueConstraintIndex]...)
		copyOfUniqueConstraints = append(copyOfUniqueConstraints, uniqueConstraints[uniqueConstraintIndex+1:]...)

		return operator.RecreateTable(table, copyOfUniqueConstraints)
	}

	if operator.support.SCreateAndDropConstraint {
		return [][]byte{toDropConstraint.ToDropSQL(operator.fmter, table.Name)}
	}

	return operator.RecreateTable(table, uniqueConstraints)
}

func (operator *Operator) DiffIndices(oldIndices []Index, newIndices []Index) [][]byte {
	sqls := [][]byte{}

	for i, oldIndex := range oldIndices {
		if index := operator.findIndex(newIndices, oldIndex); index == -1 {
			sqls = append(sqls, oldIndex.ToDropSQL(operator.fmter))
			continue
		}

		if oldIndex.IsNamed() {
			sqls = append(sqls, oldIndex.ToDropSQL(operator.fmter))
			sqls = append(sqls, newIndices[i].ToCreateSQL(operator.fmter))
		}
	}

	for _, newIndex := range newIndices {
		if index := operator.findIndex(oldIndices, newIndex); index == -1 {
			sqls = append(sqls, newIndex.ToCreateSQL(operator.fmter))
		}
	}

	return sqls
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

func (*Operator) findForeignKeyConstraint(table *Table, constraint Constraint) int {
	if constraint.Type() != ConstraintTypeForeignKey {
		return -1
	}

	for i, fkConstraint := range table.ForeignKeyConstraints {
		if fkConstraint.Equals(constraint) {
			return i
		}
	}

	return -1
}

func (*Operator) findIndex(indices []Index, index Index) int {
	for i, inputIndex := range indices {
		if index.Equals(inputIndex) {
			return i
		}
	}

	return -1
}
