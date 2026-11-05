package querybuilder

import "github.com/huandu/go-sqlbuilder"

// AddOffset skips offset rows. Call it after the ORDER BY and LIMIT clauses:
// the ClickHouse flavor renders OFFSET only inside a LIMIT, so an unlimited
// page writes the clause itself at the current position.
func AddOffset(sb *sqlbuilder.SelectBuilder, limit, offset int) {
	if offset <= 0 {
		return
	}
	if limit > 0 {
		sb.Offset(offset)
		return
	}
	sb.SQL("OFFSET " + sb.Var(offset))
}
