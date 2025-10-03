; Function calls

(call_expression
  caller: (identifier) @function)

(call_expression
  caller: (identifier) @function.builtin
  (#match? @function.builtin "^(trim|print|len|range|ok|err|some)$"))

; Function definitions

(enum_member_declaration
  name: (field_identifier) @variable.member)

(type_declaration
  name: (field_identifier) @type.definition)
; Identifiers

(data_type) @type
(member_expr_member) @property
(type_identifier) @type
(field_identifier) @property
(identifier) @variable

"->" @punctuation.special
"=>" @punctuation.special
"|>" @punctuation.special

"." @punctuation.delimiter
"," @punctuation.delimiter

"(" @punctuation.bracket
")" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"<" @punctuation.bracket
">" @punctuation.bracket

(mutability) @keyword
; Operators

[
  "-"
  "-="
  "!"
  "!="
  ".."
  "..="
  "**"
  "*"
  "*="
  "/"
  "/="
  "&"
  "&&"
  "&="
  "%"
  "%="
  "^"
  "^="
  "+"
  "+="
  "<"
  "<<"
  "<<="
  "="
  "=="
  ">"
  ">="
  ">>"
  ">>="
  "|"
  "|="
  "||"
  "in"
  "as"
  "is"
] @operator

; Keywords

[
  "break"
  "match"
  "const"
  "continue"
  "async"
  "try"
  "impl"
  "for"
  "fn"
  "let"
  "struct"
] @keyword

"return" @keyword.return

[
  "if"
  "else"
] @keyword.conditional

[
  "struct"
  "enum"
  "type"
] @keyword.type


; Literals

[
  (string_literal)
  (rune_literal)
] @string

(escape_sequence) @escape

[
  (int_literal)
  (imaginary_literal)
] @number

(float_literal) @number.float

(comment) @comment
