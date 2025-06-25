grammar FilterQuery;

/*
 * Parser Rules
 */

query
    : expression ( (AND | OR) expression | expression )*
    EOF
    ;

expression
    : orExpression
    ;

orExpression
    : andExpression ( OR andExpression )*
    ;

andExpression
    : unaryExpression ( AND unaryExpression | unaryExpression )*
    ;

unaryExpression
    : NOT? primary
    ;

primary
    : LPAREN orExpression RPAREN
    | comparison
    | functionCall
    | fullText
    ;

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
    | key NOT_BETWEEN value AND value
    | key inClause
    | key notInClause
    | key EXISTS
    | key NOT_EXISTS
    | key REGEXP value
    | key NOT_REGEXP value
    | key CONTAINS value
    | key NOT_CONTAINS value
    ;

inClause
    : IN LPAREN valueList RPAREN
    | IN LBRACK valueList RBRACK
    ;

notInClause
    : NOT_IN LPAREN valueList RPAREN
    | NOT_IN LBRACK valueList RBRACK
    ;

valueList
    : value ( COMMA value )*
    ;

fullText
    : QUOTED_TEXT
    ;

functionCall
    : (HAS | HASANY | HASALL | HASNONE) LPAREN functionParamList RPAREN
    ;

functionParamList
    : functionParam ( COMMA functionParam )*
    ;

functionParam
    : key
    | value
    | array
    ;

array
    : LBRACK valueList RBRACK
    ;

value
    : QUOTED_TEXT
    | NUMBER
    | BOOL
    | KEY
    ;

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
NEQ         : '<>' ;
LT          : '<' ;
LE          : '<=' ;
GT          : '>' ;
GE          : '>=' ;

// Multi-keyword operators
LIKE        : [Ll][Ii][Kk][Ee] ;
NOT_LIKE    : [Nn][Oo][Tt] '_' [Ll][Ii][Kk][Ee] ;
ILIKE       : [Ii][Ll][Ii][Kk][Ee] ;
NOT_ILIKE   : [Nn][Oo][Tt] '_' [Ii][Ll][Ii][Kk][Ee] ;
BETWEEN     : [Bb][Ee][Tt][Ww][Ee][Ee][Nn] ;
NOT_BETWEEN : [Nn][Oo][Tt] '_' [Bb][Ee][Tt][Ww][Ee][Ee][Nn] ;

EXISTS      : [Ee][Xx][Ii][Ss][Tt][Ss]? ;
NOT_EXISTS  : [Nn][Oo][Tt] '-' [Ee][Xx][Ii][Ss][Tt][Ss]? ;

REGEXP      : [Rr][Ee][Gg][Ee][Xx][Pp] ;
NOT_REGEXP  : [Nn][Oo][Tt] '_' [Rr][Ee][Gg][Ee][Xx][Pp] ;

CONTAINS    : [Cc][Oo][Nn][Tt][Aa][Ii][Nn][Ss]? ;
NOT_CONTAINS: [Nn][Oo][Tt] '_' [Cc][Oo][Nn][Tt][Aa][Ii][Nn][Ss]? ;

IN          : [Ii][Nn] ;
NOT_IN      : [Nn][Oo][Tt] '_' [Ii][Nn] ;

// Boolean logic
NOT         : [Nn][Oo][Tt] ;
AND         : [Aa][Nn][Dd] ;
OR          : [Oo][Rr] ;

// Functions
HAS         : [Hh][Aa][Ss] ;
HASANY      : [Hh][Aa][Ss][Aa][Nn][Yy] ;
HASALL      : [Hh][Aa][Ss][Aa][Ll][Ll] ;
HASNONE     : [Hh][Aa][Ss][Nn][Oo][Nn][Ee] ;

// Boolean values
BOOL
    : [Tt][Rr][Uu][Ee]
    | [Ff][Aa][Ll][Ss][Ee]
    ;

// Numbers
NUMBER
    : DIGIT+ ( '.' DIGIT+ )?
    ;

// Quoted text
QUOTED_TEXT
    : ( '"' ( ~["\\] | '\\' . )* '"'    // double-quoted
      | '\'' ( ~['\\] | '\\' . )* '\''  // single-quoted
      )
    ;

// Keys
KEY
    : [a-zA-Z0-9_] [a-zA-Z0-9_.[\]]*
    ;

// Whitespace
WS
    : [ \t\r\n]+ -> skip
    ;

// Digits fragment
fragment DIGIT
    : [0-9]
    ;
