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

// AND expressions
andExpression
    : primary ( AND primary )*
    ;

// Primary: an optionally negated parenthesized expression, or a comparison.
// NOT is only allowed on grouped expressions, not on bare comparisons.
// E.g.: NOT (count() > 100 AND sum(bytes) < 500)
primary
    : NOT? LPAREN orExpression RPAREN
    | comparison
    ;

/*
 * Comparison between two arithmetic operands.
 * E.g.: count() > 100, total_duration >= 500, __result_0 != 0
 */
comparison
    : operand compOp operand
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
 * Factors: atoms or parenthesized operands for arithmetic grouping.
 * E.g.: (sum(a) + sum(b)) * 2 > 100
 */
factor
    : LPAREN operand RPAREN
    | atom
    ;

/*
 * Atoms are the basic building blocks of arithmetic operands:
 *   - aggregate function calls:  count(), sum(bytes), avg(duration)
 *   - identifier references:     aliases, result refs (__result, __result_0, __result0)
 *   - numeric literals:          100, 0.5, 1e6
 *
 * Quoted string literals are intentionally excluded — HAVING expressions
 * compare aggregate results which are always numeric.
 */
atom
    : functionCall
    | identifier
    | NUMBER
    ;

/*
 * Aggregate function calls:
 *   - count()
 *   - sum(bytes)
 *   - avg(duration_nano)
 *
 * Arguments are restricted to a single column identifier.
 * Nested function calls are not valid in HAVING expressions —
 * reference nested aggregations by alias or expression string instead.
 */
functionCall
    : IDENTIFIER LPAREN functionArgs? RPAREN
    ;

functionArgs
    : functionArg ( COMMA functionArg )*
    ;

// Function argument: a column being aggregated (e.g. bytes, duration_nano)
functionArg
    : IDENTIFIER
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

// Quoted string literals (double or single-quoted, with escape support)
QUOTED_TEXT
    : '"' ( ~["\\] | '\\' . )* '"'
    | '\'' ( ~['\\] | '\\' . )* '\''
    ;

// Identifiers: start with a letter or underscore, followed by alphanumeric/underscores.
// Optionally dotted for nested field paths.
// Covers: count, sum, p99, total_logs, error_count, __result, __result_0, __result0,
//         service.name, span.duration
IDENTIFIER
    : [a-zA-Z_] [a-zA-Z0-9_]* ( '.' [a-zA-Z_] [a-zA-Z0-9_]* )*
    ;

// Skip whitespace
WS
    : [ \t\r\n]+ -> skip
    ;

fragment DIGIT : [0-9] ;
