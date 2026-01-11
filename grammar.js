/**
 * @file A scripting language entirely made in rust for educational purposes
 * @author Creative Coders <officialccoders@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  primary: 150,
  unary: 140,
  as: 130,
  power: 120,
  multiplicative: 110,
  additive: 100,
  shift: 90,
  bitwise: 80,
  is: 70,
  in: 60,
  comparative: 50,
  and: 40,
  or: 30,
  range: 20,
  composite_literal: -1,
};

const multiplicativeOperators = ["*", "/", "%"];
const additiveOperators = ["+", "-"];
const bitwiseOperators = ["&", "|", "^"];
const shiftOperators = [">>", "<<"];
const comparativeOperators = ["==", "!=", "<", "<=", ">", ">="];
const rangeOperators = ["..", "..="];

const assignmentOperators = multiplicativeOperators
  .concat(additiveOperators)
  .concat(bitwiseOperators)
  .concat(shiftOperators)
  .concat(["&&", "||", "**"])
  .map((operator) => operator + "=")
  .concat("=");

const char = /[^"\n\\]+/;
const terminator = choice(";", /\n/);

const hexDigit = /[0-9a-fA-F]/;
const octalDigit = /[0-7]/;
const decimalDigit = /[0-9]/;
const binaryDigit = /[01]/;

const hexDigits = seq(hexDigit, repeat(seq(optional("_"), hexDigit)));
const octalDigits = seq(octalDigit, repeat(seq(optional("_"), octalDigit)));
const decimalDigits = seq(
  decimalDigit,
  repeat(seq(optional("_"), decimalDigit)),
);
const binaryDigits = seq(binaryDigit, repeat(seq(optional("_"), binaryDigit)));

const hexLiteral = seq("0", choice("x", "X"), optional("_"), hexDigits);
const octalLiteral = seq(
  "0",
  optional(choice("o", "O")),
  optional("_"),
  octalDigits,
);
const decimalLiteral = choice(
  "0",
  seq(/[1-9]/, optional(seq(optional("_"), decimalDigits))),
);
const binaryLiteral = seq("0", choice("b", "B"), optional("_"), binaryDigits);

const intLiteral = choice(
  binaryLiteral,
  decimalLiteral,
  octalLiteral,
  hexLiteral,
);

const decimalExponent = seq(
  choice("e", "E"),
  optional(choice("+", "-")),
  decimalDigits,
);
const decimalFloatLiteral = choice(
  seq(decimalDigits, ".", optional(decimalDigits), optional(decimalExponent)),
  seq(decimalDigits, decimalExponent),
  seq(".", decimalDigits, optional(decimalExponent)),
);

const hexExponent = seq(
  choice("p", "P"),
  optional(choice("+", "-")),
  decimalDigits,
);
const hexMantissa = choice(
  seq(optional("_"), hexDigits, ".", optional(hexDigits)),
  seq(optional("_"), hexDigits),
  seq(".", hexDigits),
);
const hexFloatLiteral = seq("0", choice("x", "X"), hexMantissa, hexExponent);

const floatLiteral = choice(decimalFloatLiteral, hexFloatLiteral);
const imaginaryLiteral = seq(
  choice(decimalDigits, intLiteral, floatLiteral),
  "i",
);

module.exports = grammar({
  name: "calibre",

  extras: ($) => [/\s/, $.comment],

  rules: {
    source_file: ($) => repeat($._delimited_statement),

    _delimited_statement: ($) => seq($._statement, terminator),

    _statement: ($) =>
      choice(
        $.var_declaration,
        $.loop_declaration,
        $.impl_declaration,
        $.stop_statement,
        $.type_declaration,
        $._expression,
      ),

    _expression: ($) =>
      prec.left(
        choice(
          $.ternary,
          $.not_expression,
          $.special_binary_expression,
          $.type_binary_expression,
          $.binary_expression,
          $.try_expression,
          $.debug_expression,
          $.identifier,
          $.func_expression,
          $.string_literal,
          $.int_literal,
          $.float_literal,
          $.imaginary_literal,
          $.rune_literal,
          $.scope,
          $.ref,
          $.deref,
          $.parens,
          $.list_literal,
          $.assignment_expression,
          $.object_expression,
          $.member_expression,
          $.scope_member_expression,
          $.pipe_expression,
          $.call_expression,
          $.call_node_expression,
          $.if_declaration,
          $.match_declaration,
          choice(";", /\n/),
        ),
      ),

    identifier: (_) => /[_\p{XID_Start}][_\p{XID_Continue}]*/,
    _type_identifier: ($) => prec(PREC.primary, field("name", $.identifier)),
    _scope_identifier: ($) => alias($.identifier, $.scope_identifier),
    _field_identifier: ($) => alias($.identifier, $.field_identifier),

    var_declaration: ($) =>
      seq(
        choice(seq("let", optional("mut")), "const"),
        field("name", $.identifier),
        field("type", optional(seq(":", $.data_type))),
        "=",
        field("value", $._statement),
      ),

    type_declaration: ($) =>
      seq(
        "type",
        field("name", $._field_identifier),
        "=",
        choice($.data_type, $.enum_declaration, $.struct_declaration),
      ),

    enum_declaration: ($) =>
      prec.left(seq("enum", "{", commaSep1($.enum_member_declaration), "}")),

    enum_member_declaration: ($) =>
      seq(field("name", $._field_identifier), optional(seq(":", $.data_type))),

    struct_declaration: ($) =>
      prec.left(seq("struct", optional($.key_type_list_object_val))),

    impl_declaration: ($) =>
      seq(
        "impl",
        field("name", $._type_identifier),
        "{",
        field("functions", repeat($.var_declaration)),
        "}",
      ),

    key_type_list_object_val: ($) =>
      choice(
        seq(
          "{",
          field(
            "types",
            commaSep1(
              seq(field("name", $.identifier), ":", "type", $.data_type),
            ),
          ),
          "}",
        ),
        seq("(", field("types", commaSep1($.data_type)), ")"),
      ),

    if_declaration: ($) =>
      prec.left(
        seq(
          "if",
          field("comparison", choice($.if_let_comparison, $._expression)),
          field("then", $.block),
          field(
            "otherwise",
            optional(seq("else", choice($.if_declaration, $.block))),
          ),
        ),
      ),

    if_let_comparison: ($) =>
      seq(
        "let",
        field("patterns", $.or_list),
        field("conditionals", optional($.conditionals_list)),
        "<-",
        field("value", $._expression),
      ),

    match_declaration: ($) =>
      seq(
        "match",
        field("async", optional("async")),
        field("type", optional($.data_type)),
        field("default", optional(seq("=", $._statement))),
        field("return", optional(seq("->", $.data_type))),
        "{",
        commaSep1($.match_pattern),
        "}",
      ),

    match_pattern: ($) =>
      seq(
        field("values", $.or_list),
        field("conditionals", optional($.conditionals_list)),
        field("body", $.block),
      ),

    match_arm_start: ($) =>
      choice(
        "_",
        seq(
          choice(seq("let", optional("mut")), "const"),
          field("name", $.identifier),
        ),
        seq(
          ".",
          field("variant", $._field_identifier),
          optional(seq(":", $.identifier)),
        ),
        $._expression,
      ),

    or_list: ($) => sep1($.match_arm_start, "|"),
    conditionals_list: ($) => seq("if", sep1("if", $._statement)),

    loop_declaration: ($) =>
      seq(
        "for",
        optional(
          field(
            "loop_type",
            choice(
              prec(
                2,
                seq(
                  field("name", $.identifier),
                  "in",
                  field("value", $._statement),
                ),
              ),
              $.if_let_comparison,
              $._statement,
            ),
          ),
        ),
        field("body", $.block),
      ),

    func_expression: ($) =>
      seq(
        "fn",
        field("parameters", $.parameter_list),
        field("async", optional("async")),
        field("result", optional(seq("->", $.data_type))),
        field("body", $.block),
      ),

    block: ($) => seq("=>", $._statement),

    scope: ($) => prec(PREC.primary, seq("{", optional($.statement_list), "}")),
    statement_list: ($) => repeat1($._delimited_statement),

    parens: ($) => prec(145, seq("(", $._statement, ")")),

    list_literal: ($) => seq($.data_type, "[", commaSep($._statement), "]"),

    deref: ($) => prec.left(seq("*", $.deref_operand)),
    deref_operand: ($) =>
      prec.left(choice($.identifier, $.member_expression, $.deref)),

    mutability: ($) => prec.left(choice("&", "&mut", "mut")),
    ref: ($) => prec.left(seq($.mutability, $.ref_operand)),
    ref_operand: ($) =>
      prec.left(choice($.identifier, $.member_expression, $.ref)),

    scope_member_expression: ($) =>
      prec.left(
        seq(
          field("root", $._scope_identifier),
          field("scope_members", repeat(seq("::", $._scope_identifier))),
          "::",
          field("members", $.member_expression),
        ),
      ),

    member_expression: ($) =>
      prec.left(
        choice(
          prec(
            2,
            seq(
              field("root", $.identifier),
              repeat1(
                choice(
                  seq("[", $._expression, "]"),
                  seq(".", $._field_identifier),
                  $.call_expression,
                ),
              ),
              optional($.key_value),
            ),
          ),
          prec(
            1,
            seq(
              field("root", $.identifier),
              ".",
              field("variant", $._field_identifier),
              optional(seq(":", $.data_type)),
            ),
          ),
        ),
      ),

    stop_statement: ($) =>
      prec(-10, choice("break", "continue", seq("return", $._expression))),

    object_expression: ($) => prec(145, $.key_value),

    pipe_expression: ($) =>
      prec(10, prec.left(seq($._statement, "|>", sep1($._statement, "|>")))),

    key_value: ($) =>
      seq(
        "{",
        commaSep1(
          choice(
            field("value", $.identifier),
            seq(
              field("key", $._field_identifier),
              ":",
              field("value", $._statement),
            ),
          ),
        ),
        "}",
      ),

    parameter_list: ($) =>
      seq(
        "(",
        commaSep(
          seq(
            field("name", repeat1($.identifier)),
            field("type", optional(seq(":", $.data_type))),
            field("default", optional(seq("=", $._expression))),
          ),
        ),
        ")",
      ),

    data_type: ($) =>
      prec(
        PREC.primary,
        prec.left(
          choice(
            "null",
            "int",
            "float",
            "dyn",
            "bool",
            "str",
            "char",
            "range",
            "struct",
            prec.left(seq($.mutability, $.data_type)),
            seq("<", field("types", commaSep1($.data_type)), ">"),
            seq($._scope_identifier, "::", $.data_type),
            choice(
              seq("!", $.data_type),
              seq($.data_type, "!"),
              seq($.data_type, "!", $.data_type),
            ),
            seq("list", optional(seq("<", $.data_type, ">"))),
            seq($.data_type, "?"),
            seq(
              "fn",
              "(",
              field("parameters", optional(commaSep1($.data_type))),
              ")",
              "->",
              field("return", $.data_type),
            ),
            $._type_identifier,
          ),
        ),
      ),
    ternary: ($) =>
      prec(
        PREC.primary,
        prec.left(
          seq("(", $._expression, ")", "?", $._expression, ":", $._expression),
        ),
      ),

    assignment_expression: ($) =>
      prec.left(
        seq(
          field("left", choice($.identifier, $.member_expression, $.ternary)),
          field("operator", choice(...assignmentOperators)),
          field("right", $._statement),
        ),
      ),

    try_expression: ($) => prec(PREC.primary, seq("try", $._expression)),
    debug_expression: ($) => prec(PREC.primary, seq("debug", $._expression)),

    not_expression: ($) =>
      prec(
        PREC.unary,
        seq(
          field("operator", choice("-", "!")),
          field("operand", $._statement),
        ),
      ),

    call_node_expression: ($) =>
      prec(
        160,
        seq(field("caller", $._expression), field("args", $.argument_list)),
      ),
    call_expression: ($) =>
      seq(field("caller", $.identifier), field("args", $.argument_list)),
    argument_list: ($) => seq("(", commaSep($._statement), ")"),

    binary_expression: ($) =>
      choice(
        ...[
          [PREC.multiplicative, choice(...multiplicativeOperators)],
          [PREC.additive, choice(...additiveOperators)],
          [PREC.comparative, choice(...comparativeOperators)],
          [PREC.shift, choice(...shiftOperators)],
          [PREC.bitwise, choice(...bitwiseOperators)],
          [PREC.and, "&&"],
          [PREC.or, "||"],
          [PREC.range, choice(...rangeOperators)],
          [PREC.power, "**"],
        ].map(([p, op]) =>
          _binary_op(
            p,
            field("left", $._expression),
            op,
            field("right", $._expression),
          ),
        ),
      ),

    type_binary_expression: ($) =>
      choice(
        ...[
          [PREC.as, "as"],
          [PREC.is, "is"],
        ].map(([p, op]) =>
          _binary_op(
            p,
            field("left", $._expression),
            op,
            field("type", $.data_type),
          ),
        ),
      ),

    special_binary_expression: ($) =>
      choice(
        ...[[PREC.in, "in"]].map(([p, op]) =>
          _binary_op(
            p,
            field("left", $._expression),
            op,
            field("type", $._statement),
          ),
        ),
      ),

    string_literal: ($) =>
      prec(
        PREC.primary,
        seq('"', repeat(choice($.escape_sequence, char)), token.immediate('"')),
      ),

    escape_sequence: (_) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[^xuU]/,
            /\d{2,3}/,
            /x[0-9a-fA-F]{2,}/,
            /u[0-9a-fA-F]{4}/,
            /U[0-9a-fA-F]{8}/,
          ),
        ),
      ),

    int_literal: (_) => prec(PREC.primary, token(intLiteral)),
    float_literal: (_) => prec(PREC.primary, token(floatLiteral)),
    imaginary_literal: (_) => prec(PREC.primary, token(imaginaryLiteral)),

    rune_literal: (_) =>
      prec(
        PREC.primary,
        token(
          seq(
            "'",
            choice(
              /[^'\\]/,
              seq(
                "\\",
                choice(
                  seq("x", hexDigit, hexDigit),
                  seq(octalDigit, octalDigit, octalDigit),
                  seq("u", hexDigit, hexDigit, hexDigit, hexDigit),
                  seq(
                    "U",
                    hexDigit,
                    hexDigit,
                    hexDigit,
                    hexDigit,
                    hexDigit,
                    hexDigit,
                    hexDigit,
                    hexDigit,
                  ),
                  choice("a", "b", "f", "n", "r", "t", "v", "\\", "'", '"'),
                ),
              ),
            ),
            "'",
          ),
        ),
      ),

    comment: (_) =>
      token(
        choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),
  },
});

function _binary_op(precedence, left, operator, right) {
  return prec.left(precedence, seq(left, field("operator", operator), right));
}

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function commaSep1(rule) {
  return sep1(rule, ",");
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}
