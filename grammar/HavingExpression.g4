grammar HavingExpression;

/*
 * Parser Rules
 */

query
    : expression EOF
    ;

// Expression with standard boolean precedence:
//    - parentheses > NOT > AND > OR
expression
    : orExpression
    ;

// OR expressions
orExpression
    : andExpression ( OR andExpression )*
    ;

// AND expressions + optional chaining with implicit AND if no OR is present
andExpression
    : primary ( AND primary | primary )*
    ;

// Primary: an optionally negated expression.
// NOT can be applied to a parenthesized expression or a bare comparison / IN-test.
// E.g.: NOT (count() > 100 AND sum(bytes) < 500)
//       NOT count() > 100
//       count() IN (1, 2, 3)      -- NOT here is part of comparison, see below
//       count() NOT IN (1, 2, 3)
primary
    : NOT? LPAREN orExpression RPAREN
    | NOT? comparison
    ;

/*
 * Comparison between two arithmetic operands, or an IN / NOT IN membership test.
 * E.g.: count() > 100, total_duration >= 500, __result_0 != 0
 *       count() IN (1, 2, 3), sum(bytes) NOT IN (0, -1)
 */
comparison
    : operand compOp operand
    | operand NOT? IN LPAREN inList RPAREN
    ;

compOp
    : EQUALS
    | NOT_EQUALS
    | NEQ
    | LT
    | LE
    | GT
    | GE
    ;

/*
 * IN-list: a comma-separated list of numeric literals.
 * E.g.: (1, 2, 3), (100, 200, 500)
 */
inList
    : NUMBER ( COMMA NUMBER )*
    ;

/*
 * Operands support additive arithmetic (+/-).
 * E.g.: sum(a) + sum(b) > 1000, count() - 10 > 0
 */
operand
    : operand (PLUS | MINUS) term
    | term
    ;

/*
 * Terms support multiplicative arithmetic (*, /, %)
 * E.g.: count() * 2 > 100, sum(bytes) / 1024 > 10
 */
term
    : term (STAR | SLASH | PERCENT) factor
    | factor
    ;

/*
 * Factors: atoms, parenthesized operands, or unary-signed sub-factors.
 * E.g.: (sum(a) + sum(b)) * 2 > 100, -count() > 0, -(avg(x) + 1) > 0
 *
 * Note: the lexer's NUMBER rule includes an optional SIGN prefix, so a bare
 * negative literal like -10 is a single NUMBER token and is handled by atom,
 * not by the unary rule here. Unary sign applies when the operand following
 * the sign is a non-literal: a function call, an identifier, or a parenthesised
 * expression. As a result, `count()-10 > 0` is always rejected: after `count()`
 * the lexer produces NUMBER(-10), which is not a valid compOp or binary operator.
 */
factor
    : (PLUS | MINUS) factor
    | LPAREN operand RPAREN
    | atom
    ;

/*
 * Atoms are the basic building blocks of arithmetic operands:
 *   - aggregate function calls:  count(), sum(bytes), avg(duration)
 *   - identifier references:     aliases, result refs (__result, __result_0, __result0)
 *   - numeric literals:          100, 0.5, 1e6
 *   - string literals:           'xyz' — recognized so we can give a friendly error
 *
 * String literals in HAVING are always invalid (aggregator results are numeric),
 * but we accept them here so the visitor can produce a clear error message instead
 * of a raw syntax error.
 */
atom
    : functionCall
    | identifier
    | NUMBER
    | STRING
    ;

/*
 * Aggregate function calls, e.g.:
 *   count(), sum(bytes), avg(duration_nano)
 *   countIf(level='error'), sumIf(bytes, status > 400)
 *   p99(duration), avg(sum(cpu_usage))
 *
 * Function arguments are parsed as a permissive token sequence (funcArgToken+)
 * so that complex aggregation expressions — including nested function calls and
 * filter predicates with string literals — can be referenced verbatim in the
 * HAVING expression. The visitor looks up the full call text (whitespace-free,
 * via ctx.GetText()) in the column map, which stores normalized (space-stripped)
 * aggregation expression keys.
 */
functionCall
    : IDENTIFIER LPAREN functionArgList? RPAREN
    ;

functionArgList
    : funcArg ( COMMA funcArg )*
    ;

/*
 * A single function argument is one or more consecutive arg-tokens.
 * Commas at the top level separate arguments; closing parens terminate the list.
 */
funcArg
    : funcArgToken+
    ;

/*
 * Permissive token set for function argument content. Covers:
 *   - simple identifiers:     bytes, duration
 *   - string literals:        'error', "info"
 *   - numeric literals:       200, 3.14
 *   - comparison operators:   level='error', status > 400
 *   - arithmetic operators:   x + y
 *   - boolean connectives:    level='error' AND status=200
 *   - balanced parens:        nested calls like sum(duration)
 */
funcArgToken
    : IDENTIFIER
    | STRING
    | NUMBER
    | BOOL
    | EQUALS | NOT_EQUALS | NEQ | LT | LE | GT | GE
    | PLUS | MINUS | STAR | SLASH | PERCENT
    | NOT | AND | OR
    | LPAREN funcArgToken* RPAREN
    ;

// Identifier references: aliases, field names, result references
// Examples: total_logs, error_count, __result, __result_0, __result0, p99
identifier
    : IDENTIFIER
    ;

/*
 * Lexer Rules
 */

// Punctuation
LPAREN  : '(' ;
RPAREN  : ')' ;
COMMA   : ',' ;

// Comparison operators
EQUALS      : '=' | '==' ;
NOT_EQUALS  : '!=' ;
NEQ         : '<>' ;       // alternate not-equals operator
LT          : '<' ;
LE          : '<=' ;
GT          : '>' ;
GE          : '>=' ;

// Arithmetic operators
PLUS    : '+' ;
MINUS   : '-' ;
STAR    : '*' ;
SLASH   : '/' ;
PERCENT : '%' ;

// Boolean logic (case-insensitive)
NOT : [Nn][Oo][Tt] ;
AND : [Aa][Nn][Dd] ;
OR  : [Oo][Rr] ;
IN  : [Ii][Nn] ;

// Boolean constants (case-insensitive)
BOOL
    : [Tt][Rr][Uu][Ee]
    | [Ff][Aa][Ll][Ss][Ee]
    ;

fragment SIGN : [+-] ;

// Numbers: optional sign, digits, optional decimal, optional scientific notation
// E.g.: 100, -10, 0.5, 1.5e3, .75, -3.14
NUMBER
    : SIGN? DIGIT+ ('.' DIGIT*)? ([eE] SIGN? DIGIT+)?
    | SIGN? '.' DIGIT+ ([eE] SIGN? DIGIT+)?
    ;

// Identifiers: start with a letter or underscore, followed by alphanumeric/underscores.
// Optionally dotted for nested field paths.
// Covers: count, sum, p99, total_logs, error_count, __result, __result_0, __result0,
//         service.name, span.duration
IDENTIFIER
    : [a-zA-Z_] [a-zA-Z0-9_]* ( '.' [a-zA-Z_] [a-zA-Z0-9_]* )*
    ;

// Quoted string literals (single or double-quoted).
// These are valid tokens inside function arguments (e.g. countIf(level='error'))
// but are always rejected in comparison-operand position by the visitor.
STRING
    : '\'' (~'\'')* '\''
    | '"' (~'"')* '"'
    ;

// Skip whitespace
WS
    : [ \t\r\n]+ -> skip
    ;

fragment DIGIT : [0-9] ;
