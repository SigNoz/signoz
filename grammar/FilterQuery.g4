grammar FilterQuery;

/*
 * Parser Rules
 */

query
    : expression
    EOF
    ;

// Expression with standard boolean precedence:
//    - parentheses > NOT > AND > OR
//    - consecutive expressions with no AND/OR => implicit AND
expression
    : orExpression
    ;

// OR expressions
orExpression
    : andExpression ( OR andExpression )*
    ;

// AND expressions + optional chaining with implicit AND if no OR is present
andExpression
    : unaryExpression ( AND unaryExpression | unaryExpression )*
    ;

// A unary expression handles optional NOT
unaryExpression
    : NOT? primary
    ;

// Primary constructs: grouped expressions, a comparison (key op value),
// a function call, or a full-text string
primary
    : LPAREN orExpression RPAREN
    | comparison
    | functionCall
    | fullText
    | key
    ;

/*
 * Comparison-like filters
 *
 * Includes all operators: =, !=, <>, <, <=, >, >=, [NOT] LIKE, [NOT] ILIKE,
 * [NOT] BETWEEN, [NOT] IN, [NOT] EXISTS, [NOT] REGEXP, [NOT] CONTAINS, etc.
 */
comparison
    : key EQUALS value
    | key (NOT_EQUALS | NEQ) value
    | key LT value
    | key LE value
    | key GT value
    | key GE value

    | key (LIKE | ILIKE) value
    | key (NOT_LIKE | NOT_ILIKE) value

    | key BETWEEN value AND value
    | key NOT BETWEEN value AND value

    | key inClause
    | key notInClause

    | key EXISTS
    | key NOT EXISTS

    | key REGEXP value
    | key NOT REGEXP value

    | key CONTAINS value
    | key NOT CONTAINS value
    ;

// in(...) or in[...] 
inClause
    : IN LPAREN valueList RPAREN
    | IN LBRACK valueList RBRACK
    ;

notInClause
    : NOT IN LPAREN valueList RPAREN
    | NOT IN LBRACK valueList RBRACK
    ;

// List of values for in(...) or in[...]
valueList
    : value ( COMMA value )*
    ;

// Full-text search: a standalone quoted string is allowed as a "primary"
// e.g. `"Waiting for response" http.status_code=200`
fullText
    : QUOTED_TEXT
    | FREETEXT
    ;

/*
 * Function calls like:
 *    has(payload.user_ids, 123)
 *    hasAny(payload.user_ids, [123, 456])
 *    ...
 */
functionCall
    : (HAS | HASANY | HASALL) LPAREN functionParamList RPAREN
    ;

// Function parameters can be keys, single scalar values, or arrays
functionParamList
    : functionParam ( COMMA functionParam )*
    ;

functionParam
    : key
    | value
    | array
    ;

// An array: [ item1, item2, item3 ]
array
    : LBRACK valueList RBRACK
    ;

/*
 * A 'value' can be a string literal (double or single-quoted),
//  a numeric literal, boolean, or a "bare" token as needed.
 */
value
    : QUOTED_TEXT
    | NUMBER
    | BOOL
    | KEY
    ;

/*
 * A key can include letters, digits, underscores, dots, brackets
 * E.g. service.name, query_log.query_duration_ms, proto.user_objects[].name
 */
key
    : KEY
    ;


/*
 * Lexer Rules
 */

// Common punctuation / symbols
LPAREN : '(' ;
RPAREN : ')' ;
LBRACK : '[' ;
RBRACK : ']' ;
COMMA  : ','  ;

EQUALS      : '=' | '==' ;
NOT_EQUALS  : '!=' ;
NEQ         : '<>' ;       // alternate not-equals operator
LT          : '<'  ;
LE          : '<=' ;
GT          : '>'  ;
GE          : '>='  ;

// Operators that are made of multiple keywords
LIKE        : [Ll][Ii][Kk][Ee] ;
NOT_LIKE    : [Nn][Oo][Tt] [ \t]+ [Ll][Ii][Kk][Ee] ;
ILIKE       : [Ii][Ll][Ii][Kk][Ee] ;
NOT_ILIKE   : [Nn][Oo][Tt] [ \t]+ [Ii][Ll][Ii][Kk][Ee] ;
BETWEEN     : [Bb][Ee][Tt][Ww][Ee][Ee][Nn] ;
EXISTS      : [Ee][Xx][Ii][Ss][Tt][Ss]? ;
REGEXP      : [Rr][Ee][Gg][Ee][Xx][Pp] ;
CONTAINS    : [Cc][Oo][Nn][Tt][Aa][Ii][Nn][Ss]? ;
IN          : [Ii][Nn] ;

// Boolean logic
NOT         : [Nn][Oo][Tt] ;
AND         : [Aa][Nn][Dd] ;
OR          : [Oo][Rr] ;

// For easy referencing in function calls
HAS         : [Hh][Aa][Ss] ;
HASANY      : [Hh][Aa][Ss][Aa][Nn][Yy] ;
HASALL      : [Hh][Aa][Ss][Aa][Ll][Ll] ;

// Potential boolean constants
BOOL
    : [Tt][Rr][Uu][Ee]
    | [Ff][Aa][Ll][Ss][Ee]
    ;

// Numbers (integer or float). Adjust as needed for your domain.
NUMBER
    : DIGIT+ ( '.' DIGIT+ )?
    ;

// Double/single-quoted text, capturing full text search strings, values, etc.
QUOTED_TEXT
    :  (   '"' ( ~["\\] | '\\' . )* '"'     // double-quoted
        |   '\'' ( ~['\\] | '\\' . )* '\'' // single-quoted
        )
    ;

// Keys can have letters, digits, underscores, dots, and bracket pairs
// e.g. service.name, service.namespace, db.queries[].query_duration
KEY
    : [a-zA-Z0-9_] [a-zA-Z0-9_.*[\]]*
    ;

// Ignore whitespace
WS
    : [ \t\r\n]+ -> skip
    ;

// Digits used by NUMBER
fragment DIGIT
    : [0-9]
    ;

FREETEXT : (~[ \t\r\n=()'"<>!,[\]])+ ;
