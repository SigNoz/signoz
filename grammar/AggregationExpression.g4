grammar AggregationExpression;

/*
 * Parser Rules
 */

// Expressions after the first are ignored, as the rewriter always has.
query
    : expression ( COMMA expression )* EOF
    ;

/*
 * Aggregation calls combined with arithmetic. Earlier alternatives bind tighter.
 * E.g.: count(), p99(duration_nano), sum(a) + sum(b), count() / 60, -(sum(a) - sum(b))
 */
expression
    : (PLUS | MINUS) expression                      # unaryExpression
    | expression (STAR | SLASH | PERCENT) expression # multiplicativeExpression
    | expression (PLUS | MINUS) expression           # additiveExpression
    | LPAREN expression RPAREN                       # parenthesizedExpression
    | functionCall                                   # functionExpression
    | NUMBER                                         # numberExpression
    ;

/*
 * E.g.: count(), sum(bytes), count_distinct(a, b), countIf(level = 'error'),
 *       sumIf(bytes, status IN (500, 503))
 */
functionCall
    : KEY LPAREN argumentList? RPAREN
    ;

argumentList
    : argument ( COMMA argument )*
    ;

/*
 * An argument is a field key, or for a *If combinator a filter predicate, which
 * the filter grammar validates. Commas separate arguments only at the top level.
 */
argument
    : argumentToken+
    ;

argumentToken
    : KEY
    | NUMBER
    | QUOTED_TEXT
    | OPERATOR
    | PLUS | MINUS | STAR | SLASH | PERCENT
    | LPAREN ( argumentToken | COMMA )* RPAREN
    | LBRACK ( argumentToken | COMMA )* RBRACK
    | OTHER
    ;

/*
 * Lexer Rules
 */

LPAREN : '(' ;
RPAREN : ')' ;
LBRACK : '[' ;
RBRACK : ']' ;
COMMA  : ',' ;

PLUS    : '+' ;
MINUS   : '-' ;
STAR    : '*' ;
SLASH   : '/' ;
PERCENT : '%' ;

OPERATOR
    : '=' | '==' | '!=' | '<>' | '<' | '<=' | '>' | '>='
    ;

// No leading sign, so `count()-10` reads as a subtraction.
NUMBER
    : DIGIT+ ('.' DIGIT*)? ([eE] [+-]? DIGIT+)?
    | '.' DIGIT+ ([eE] [+-]? DIGIT+)?
    ;

QUOTED_TEXT
    : '"' ( ~["\\] | '\\' . )* '"'
    | '\'' ( ~['\\] | '\\' . )* '\''
    ;

// Same key syntax as the filter grammar.
fragment SEGMENT         : [a-zA-Z$_@{#] [a-zA-Z0-9$_@#{}:\-/]* ;
fragment EMPTY_BRACKS    : '[' ']' ;
fragment OLD_JSON_BRACKS : '[' '*' ']' ;

KEY
    : SEGMENT ( '.' SEGMENT | EMPTY_BRACKS | OLD_JSON_BRACKS | '.' DIGIT+ )*
    ;

WS
    : [ \t\r\n]+ -> skip
    ;

fragment DIGIT : [0-9] ;

// Anything else is left for a predicate's own grammar to judge.
OTHER : . ;
