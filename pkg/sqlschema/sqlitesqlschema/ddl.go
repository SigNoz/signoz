package sqlitesqlschema

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/SigNoz/signoz/pkg/sqlschema"
)

// Inspired by https://github.com/go-gorm/sqlite

var (
	ErrCodeInvalidDDL  = errors.MustNewCode("invalid_ddl")
	sqliteSeparator    = "`|\"|'|\t"
	sqliteIdentQuote   = "`|\"|'"
	uniqueRegexp       = regexp.MustCompile(fmt.Sprintf(`^(?:CONSTRAINT [%v]?[\w-]+[%v]? )?UNIQUE (.*)$`, sqliteSeparator, sqliteSeparator))
	tableRegexp        = regexp.MustCompile(fmt.Sprintf(`(?is)(CREATE TABLE [%v]?[\w\d-]+[%v]?)(?:\s*\((.*)\))?`, sqliteSeparator, sqliteSeparator))
	tableNameRegexp    = regexp.MustCompile(fmt.Sprintf(`CREATE TABLE [%v]?([\w-]+)[%v]?`, sqliteSeparator, sqliteSeparator))
	checkRegexp        = regexp.MustCompile(`^(?i)CHECK[\s]*\(`)
	constraintRegexp   = regexp.MustCompile(fmt.Sprintf(`CONSTRAINT\s+[%v]?[\w\d_]+[%v]?[\s]+`, sqliteSeparator, sqliteSeparator))
	foreignKeyRegexp   = regexp.MustCompile(fmt.Sprintf(`FOREIGN KEY\s*\(\s*[%v]?(\w+)[%v]?\s*\)\s*REFERENCES\s*[%v]?(\w+)[%v]?\s*\(\s*[%v]?(\w+)[%v]?\s*\)`, sqliteSeparator, sqliteSeparator, sqliteSeparator, sqliteSeparator, sqliteSeparator, sqliteSeparator))
	referencesRegexp   = regexp.MustCompile(fmt.Sprintf(`(\w+)\s*(\w+)\s*REFERENCES\s*[%v]?(\w+)[%v]?\s*\(\s*[%v]?(\w+)[%v]?\s*\)`, sqliteSeparator, sqliteSeparator, sqliteSeparator, sqliteSeparator))
	identQuoteRegexp   = regexp.MustCompile(fmt.Sprintf("[%v]", sqliteIdentQuote))
	columnRegexp       = regexp.MustCompile(fmt.Sprintf(`^[%v]?([\w\d]+)[%v]?\s+([\w\(\)\d]+)(.*)$`, sqliteSeparator, sqliteSeparator))
	defaultValueRegexp = regexp.MustCompile(`(?i) DEFAULT \(?(.+)?\)?( |COLLATE|GENERATED|$)`)
)

type parseAllColumnsState int

const (
	parseAllColumnsState_NONE parseAllColumnsState = iota
	parseAllColumnsState_Beginning
	parseAllColumnsState_ReadingRawName
	parseAllColumnsState_ReadingQuotedName
	parseAllColumnsState_EndOfName
	parseAllColumnsState_State_End
)

func parseCreateTable(str string, fmter sqlschema.SQLFormatter) (*sqlschema.Table, []*sqlschema.UniqueConstraint, error) {
	sections := tableRegexp.FindStringSubmatch(str)
	if len(sections) == 0 {
		return nil, nil, errors.New(errors.TypeInternal, ErrCodeInvalidDDL, "invalid DDL")
	}

	tableNameSections := tableNameRegexp.FindStringSubmatch(str)
	if len(tableNameSections) == 0 {
		return nil, nil, errors.New(errors.TypeInternal, ErrCodeInvalidDDL, "invalid DDL")
	}

	tableName := sqlschema.TableName(tableNameSections[1])
	fields := make([]string, 0)
	columns := make([]*sqlschema.Column, 0)
	var primaryKeyConstraint *sqlschema.PrimaryKeyConstraint
	foreignKeyConstraints := make([]*sqlschema.ForeignKeyConstraint, 0)
	uniqueConstraints := make([]*sqlschema.UniqueConstraint, 0)

	var (
		ddlBody      = sections[2]
		ddlBodyRunes = []rune(ddlBody)
		bracketLevel int
		quote        rune
		buf          string
	)
	ddlBodyRunesLen := len(ddlBodyRunes)

	for idx := 0; idx < ddlBodyRunesLen; idx++ {
		var (
			next rune = 0
			c         = ddlBodyRunes[idx]
		)
		if idx+1 < ddlBodyRunesLen {
			next = ddlBodyRunes[idx+1]
		}

		if sc := string(c); identQuoteRegexp.MatchString(sc) {
			if c == next {
				buf += sc // Skip escaped quote
				idx++
			} else if quote > 0 {
				quote = 0
			} else {
				quote = c
			}
		} else if quote == 0 {
			if c == '(' {
				bracketLevel++
			} else if c == ')' {
				bracketLevel--
			} else if bracketLevel == 0 {
				if c == ',' {
					fields = append(fields, strings.TrimSpace(buf))
					buf = ""
					continue
				}
			}
		}

		if bracketLevel < 0 {
			return nil, nil, errors.New(errors.TypeInternal, ErrCodeInvalidDDL, "invalid DDL, unbalanced brackets")
		}

		buf += string(c)
	}

	if bracketLevel != 0 {
		return nil, nil, errors.New(errors.TypeInternal, ErrCodeInvalidDDL, "invalid DDL, unbalanced brackets")
	}

	if buf != "" {
		fields = append(fields, strings.TrimSpace(buf))
	}

	for _, f := range fields {
		fUpper := strings.ToUpper(f)
		if checkRegexp.MatchString(f) {
			continue
		}

		if strings.Contains(fUpper, "FOREIGN KEY") {
			matches := foreignKeyRegexp.FindStringSubmatch(f)
			if len(matches) >= 4 {
				foreignKeyConstraints = append(foreignKeyConstraints, &sqlschema.ForeignKeyConstraint{
					ReferencingColumnName: sqlschema.ColumnName(matches[1]),
					ReferencedTableName:   sqlschema.TableName(matches[2]),
					ReferencedColumnName:  sqlschema.ColumnName(matches[3]),
				})
			}

			// This can never be a column name, so we can skip it
			continue
		}

		if strings.Contains(fUpper, "REFERENCES") && !strings.Contains(fUpper, "FOREIGN KEY") {
			matches := referencesRegexp.FindStringSubmatch(f)
			if len(matches) >= 4 {
				foreignKeyConstraints = append(foreignKeyConstraints, &sqlschema.ForeignKeyConstraint{
					ReferencingColumnName: sqlschema.ColumnName(matches[1]),
					ReferencedTableName:   sqlschema.TableName(matches[3]),
					ReferencedColumnName:  sqlschema.ColumnName(matches[4]),
				})
			}
		}

		// Match unique constraints
		if matches := uniqueRegexp.FindStringSubmatch(f); matches != nil {
			if len(matches) > 0 {
				cols, err := parseAllColumns(matches[1])
				if err == nil {
					uniqueConstraints = append(uniqueConstraints, &sqlschema.UniqueConstraint{
						ColumnNames: cols,
					})
				}
			}
			// This can never be a column name, so we can skip it
			continue
		}

		if matches := constraintRegexp.FindStringSubmatch(f); len(matches) > 0 {
			if strings.Contains(fUpper, "PRIMARY KEY") {
				cols, err := parseAllColumns(f)
				if err == nil {
					primaryKeyConstraint = &sqlschema.PrimaryKeyConstraint{
						ColumnNames: cols,
					}
				}
			}

			// This can never be a column name, so we can skip it
			continue
		}

		if strings.HasPrefix(fUpper, "PRIMARY KEY") {
			cols, err := parseAllColumns(f)
			if err == nil {
				primaryKeyConstraint = &sqlschema.PrimaryKeyConstraint{
					ColumnNames: cols,
				}
			}
		} else if matches := columnRegexp.FindStringSubmatch(f); len(matches) > 0 {
			column := &sqlschema.Column{
				Name:     sqlschema.ColumnName(matches[1]),
				DataType: fmter.DataTypeOf(matches[2]),
				Nullable: true,
				Default:  "",
			}

			matchUpper := strings.ToUpper(matches[3])
			if strings.Contains(matchUpper, " NOT NULL") {
				column.Nullable = false
			} else if strings.Contains(matchUpper, " NULL") {
				column.Nullable = true
			}

			if strings.Contains(matchUpper, " UNIQUE") && !strings.Contains(matchUpper, " PRIMARY") {
				uniqueConstraints = append(uniqueConstraints, &sqlschema.UniqueConstraint{
					ColumnNames: []sqlschema.ColumnName{column.Name},
				})
			}

			if strings.Contains(matchUpper, " PRIMARY") {
				column.Nullable = false
				primaryKeyConstraint = &sqlschema.PrimaryKeyConstraint{
					ColumnNames: []sqlschema.ColumnName{column.Name},
				}
			}

			if defaultMatches := defaultValueRegexp.FindStringSubmatch(matches[3]); len(defaultMatches) > 1 {
				if strings.ToLower(defaultMatches[1]) != "null" {
					column.Default = strings.Trim(defaultMatches[1], `"`)
				}
			}

			columns = append(columns, column)
		}
	}

	return &sqlschema.Table{
		Name:                  tableName,
		Columns:               columns,
		PrimaryKeyConstraint:  primaryKeyConstraint,
		ForeignKeyConstraints: foreignKeyConstraints,
	}, uniqueConstraints, nil
}

func parseAllColumns(in string) ([]sqlschema.ColumnName, error) {
	s := []rune(in)
	columns := make([]sqlschema.ColumnName, 0)
	state := parseAllColumnsState_NONE
	quote := rune(0)
	name := make([]rune, 0)
	for i := 0; i < len(s); i++ {
		switch state {
		case parseAllColumnsState_NONE:
			if s[i] == '(' {
				state = parseAllColumnsState_Beginning
			}
		case parseAllColumnsState_Beginning:
			if isSpace(s[i]) {
				continue
			}
			if isQuote(s[i]) {
				state = parseAllColumnsState_ReadingQuotedName
				quote = s[i]
				continue
			}
			if s[i] == '[' {
				state = parseAllColumnsState_ReadingQuotedName
				quote = ']'
				continue
			} else if s[i] == ')' {
				return columns, errors.NewInternalf(ErrCodeInvalidDDL, "unexpected token: %s", string(s[i]))
			}
			state = parseAllColumnsState_ReadingRawName
			name = append(name, s[i])
		case parseAllColumnsState_ReadingRawName:
			if isSeparator(s[i]) {
				state = parseAllColumnsState_Beginning
				columns = append(columns, sqlschema.ColumnName(name))
				name = make([]rune, 0)
				continue
			}
			if s[i] == ')' {
				state = parseAllColumnsState_State_End
				columns = append(columns, sqlschema.ColumnName(name))
			}
			if isQuote(s[i]) {
				return nil, errors.NewInternalf(ErrCodeInvalidDDL, "unexpected token: %s", string(s[i]))
			}
			if isSpace(s[i]) {
				state = parseAllColumnsState_EndOfName
				columns = append(columns, sqlschema.ColumnName(name))
				name = make([]rune, 0)
				continue
			}
			name = append(name, s[i])
		case parseAllColumnsState_ReadingQuotedName:
			if s[i] == quote {
				// check if quote character is escaped
				if i+1 < len(s) && s[i+1] == quote {
					name = append(name, quote)
					i++
					continue
				}
				state = parseAllColumnsState_EndOfName
				columns = append(columns, sqlschema.ColumnName(name))
				name = make([]rune, 0)
				continue
			}
			name = append(name, s[i])
		case parseAllColumnsState_EndOfName:
			if isSpace(s[i]) {
				continue
			}
			if isSeparator(s[i]) {
				state = parseAllColumnsState_Beginning
				continue
			}
			if s[i] == ')' {
				state = parseAllColumnsState_State_End
				continue
			}
			return nil, errors.Newf(errors.TypeInternal, ErrCodeInvalidDDL, "unexpected token: %s", string(s[i]))
		case parseAllColumnsState_State_End:
			// break is automatic in Go switch statements
		}
	}

	if state != parseAllColumnsState_State_End {
		return nil, errors.New(errors.TypeInternal, ErrCodeInvalidDDL, "unexpected end")
	}

	return columns, nil
}

func isSpace(r rune) bool {
	return r == ' ' || r == '\t'
}

func isQuote(r rune) bool {
	return r == '`' || r == '"' || r == '\''
}

func isSeparator(r rune) bool {
	return r == ','
}
