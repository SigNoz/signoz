grammar TraceOperatorGrammar;

// Entry point of the grammar (the root of the parse tree)
query   : expression+ EOF;

// Expression rules
expression
    : 'NOT' expression                                   // NOT prefix expression
    | '(' expression ')' operator expression            // Parenthesized operator expression
    | '(' expression ')'                                 // Parenthesized expression
    | left=atom operator right=expression                // Binary operator with expression on right
    | left=atom operator '(' expr=expression ')'         // Expression with parentheses inside
    | atom                                               // Simple expression (atom)
    ;

// Atom definition: atoms are identifiers (letters and optional numbers)
atom
    : IDENTIFIER                                         // General atom (combination of letters and numbers)
    ;

// Operator definition
operator
    : '=>'                                               // Implication
    | '&&'                                               // AND
    | '||'                                               // OR
    | 'NOT'                                              // NOT
    | '->'                                               // Implication
    ;

// Lexer rules

// IDENTIFIER can be a sequence of letters followed by optional numbers
IDENTIFIER
    : [a-zA-Z]+[0-9]*                                    // Letters followed by optional numbers (e.g., A1, B123, C99)
    ;

// Whitespace (to be skipped)
WS 
    : [ \t\r\n]+ -> skip;                                 // Skip whitespace
