; Function calls
(call_expression
  caller: (identifier) @function)

(call_expression
  caller: (identifier) @function.builtin
  (#match? @function.builtin "^(trim|print|len|range|ok|err|some|discriminant)$"))

(tagged_template_call
  caller: (identifier) @function)

(enum_member_declaration
  name: (field_identifier) @variable.member)

(type_declaration
  name: (field_identifier) @type.definition)

; Attributes and Scopes
(scope_attribute) @attribute
(scope_definition "=>" @punctuation.special)

; Identifiers
(data_type) @type
(type_identifier) @type
(field_identifier) @property
(identifier) @variable
(scope_identifier) @module

; Punctuation
"->" @punctuation.special
"=>" @punctuation.special
"|>" @punctuation.special
"|:" @punctuation.special
":<" @punctuation.bracket
"::" @punctuation.delimiter
"." @punctuation.delimiter
"," @punctuation.delimiter
":" @punctuation.delimiter

"(" @punctuation.bracket
")" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"<" @punctuation.bracket
">" @punctuation.bracket

; Operators
(mutability) @keyword
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
  "emit"
  "extern"
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
  "until"
  "defer"
  "debug"
  "@overload"
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

(escape_sequence) @string.escape

[
  (int_literal)
  (imaginary_literal)
] @number

(float_literal) @number.float

(comment) @comment
