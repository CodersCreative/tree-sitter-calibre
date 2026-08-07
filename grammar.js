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
  pipe: 10,
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

const decimalExponent = seq(
  choice("e", "E"),
  optional(choice("+", "-")),
  decimalDigits,
);

const intLiteral = seq(
  choice(binaryLiteral, decimalLiteral, octalLiteral, hexLiteral),
  optional(decimalExponent),
  optional(choice("u", "i", "b")),
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

const floatLiteral = seq(
  choice(decimalFloatLiteral, hexFloatLiteral),
  optional("f"),
);
const imaginaryLiteral = seq(
  choice(decimalDigits, intLiteral, floatLiteral),
  "i",
);

module.exports = grammar({
  name: "calibre",

  extras: ($) => [/\s/, $.comment],

  conflicts: ($) => [
    [$.expression, $.key_value],
    [$.list_literal, $.iter_expression, $.result_type],
    [$.result_type],
    [$.result_type, $.optional_type],
    [$.parameter_list, $.function_type],
    [$.scope_member_expression, $.scoped_type],
    [$.scoped_type, $.result_type],
    [$.scoped_type, $.optional_type],
    [$.type_declaration, $.result_type],
    [$.result_type, $.function_type],
    [$.optional_type, $.function_type],
    [$.expression, $.assignment_expression],
  ],

  rules: {
    source_file: ($) => repeat($.delimited_statement),

    delimited_statement: ($) => seq($.statement, optional(terminator)),

    statement: ($) =>
      prec.left(
        10,
        choice(
          $.extern_declaration,
          $.var_declaration,
          $.loop_declaration,
          $.impl_declaration,
          $.stop_statement,
          $.type_declaration,
          $.defer_statement,
          $.scope_definition,
          $.expression,
        ),
      ),

    expression: ($) =>
      choice(
        $.ternary,
        $.not_expression,
        $.special_binary_expression,
        $.type_binary_expression,
        $.binary_expression,
        $.try_expression,
        $.emit_expression,
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
        $.iter_expression,
        $.assignment_expression,
        $.object_expression,
        $.member_expression,
        $.enum_expression,
        $.scope_member_expression,
        $.pipe_expression,
        $.call_expression,
        $.tagged_template_call,
        $.generic_expression,
        $.if_declaration,
        $.match_declaration,
        $.fn_match_declaration,
        $.until,
      ),

    generic_expression: ($) => seq($.identifier, ":<", commaSep1($.data_type), ">"),

    identifier: (_) => /[_\p{XID_Start}][_\p{XID_Continue}]*/,

    type_identifier: ($) => prec(PREC.primary, field("name", $.identifier)),
    scope_identifier: ($) => alias($.identifier, $.scope_identifier),
    field_identifier: ($) => alias($.identifier, $.field_identifier),

    until: ($) => seq("until", $.statement),

    var_declaration: ($) =>
      prec.left(
        -50,
        seq(
          optional($.scope_definition),
          choice(seq("let", optional("mut")), "const"),
          commaSep1(
            seq(optional("mut"), field("name", choice($.identifier, ".."))),
          ),
          field("type", optional(seq(":", $.data_type))),
          optional(seq("=", field("value", $.statement))),
        ),
      ),

    defer_statement: ($) => seq("defer", $.statement),

    scope_definition: ($) =>
      prec.left(
        seq("=>", $.scope_attribute, optional($.scope_args), optional($.block)),
      ),
    scope_attribute: ($) => seq("@", $.identifier),
    scope_args: ($) => seq("[", commaSep($.scope_arg), "]"),
    scope_arg: ($) =>
      seq(
        seq("$", $.identifier),
        "=",
        choice($.expression, seq("type", ":", $.data_type)),
      ),

    type_declaration: ($) =>
      seq(
        "type",
        field("name", $.field_identifier),
        field(
          "generics",
          optional(seq(":<", commaSep($.type_identifier), ">")),
        ),
        "=",
        choice($.data_type, $.enum_declaration, $.struct_declaration),
      ),

    enum_declaration: ($) =>
      prec.left(seq("enum", "{", commaSep1($.enum_member_declaration), "}")),

    enum_member_declaration: ($) =>
      seq(field("name", $.field_identifier), optional(seq(":", $.data_type))),

    struct_declaration: ($) =>
      prec.left(
        seq(
          "struct",
          optional($.key_type_list_object_val),
          optional($.overload_block),
        ),
      ),

    overload_block: ($) =>
      seq("@overload", "{", repeat($.var_declaration), "}"),

    impl_declaration: ($) =>
      seq(
        "impl",
        field("name", $.type_identifier),
        "{",
        field("functions", repeat($.var_declaration)),
        "}",
      ),

    key_type_list_object_val: ($) =>
      choice(
        seq(
          "{",
          commaSep1(
            seq(
              field("name", $.identifier),
              ":",
              optional("type"),
              $.data_type,
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
          field("comparison", choice($.if_let_comparison, $.expression)),
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
        field("value", $.expression),
      ),

    fn_match_declaration: ($) =>
      seq(
        "fn",
        "match",
        field("async", optional("async")),
        field("type", optional($.data_type)),
        field("default", optional(seq("=", $.statement))),
        field("return", optional(seq("->", $.data_type))),
        "{",
        commaSep1($.match_pattern),
        "}",
      ),

    match_declaration: ($) =>
      seq(
        "match",
        optional(field("value", $.expression)),
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
      prec(
        1,
        choice(
          "_",
          seq(
            choice(seq("let", optional("mut")), "const"),
            field("name", $.identifier),
          ),
          seq(
            ".",
            field("variant", $.field_identifier),
            optional(seq(":", commaSep1(choice($.identifier, $.key_value)))),
          ),
          $.expression,
        ),
      ),

    or_list: ($) => sep1($.match_arm_start, "|"),
    conditionals_list: ($) => prec.left(seq("if", sep1("if", $.statement))),

    loop_declaration: ($) =>
      prec.left(
        seq(
          "for",
          optional($.loop_type),
          field("body", $.block),
          optional(field("until", $.until)),
        ),
      ),

    loop_type: ($) =>
      prec.left(
        choice(
          prec(
            2,
            seq(field("name", $.identifier), "in", field("value", $.statement)),
          ),
          $.if_let_comparison,
          $.statement,
        ),
      ),

    func_expression: ($) =>
      seq(
        "fn",
        field("generics", optional(seq("<", commaSep($.type_identifier), ">"))),
        field("parameters", $.parameter_list),
        field("async", optional("async")),
        field("result", optional(seq("->", $.data_type))),
        field("body", $.block),
      ),

    block: ($) => seq("=>", $.statement),

    scope: ($) => prec(PREC.primary, seq("{", optional($.statement_list), "}")),
    statement_list: ($) => repeat1($.delimited_statement),

    parens: ($) => prec(145, seq("(", $.statement, ")")),

    list_literal: ($) =>
      seq(optional($.data_type), "[", commaSep($.statement), "]"),

    iter_expression: ($) =>
      prec.left(
        seq(
          optional($.data_type),
          "[",
          $.statement,
          "for",
          $.loop_type,
          field("conditionals", optional($.conditionals_list)),
          optional(field("until", $.until)),
          "]",
        ),
      ),

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
          field("root", $.scope_identifier),
          field("scope_members", repeat(seq("::", $.scope_identifier))),
          "::",
          field("members", $.member_expression),
        ),
      ),

    member_expression: ($) =>
      prec.left(
        seq(
          field("root", $.identifier),
          repeat1(
            choice(
              seq("[", $.expression, "]"),
              seq(".", $.field_identifier),
            ),
          ),
        ),
      ),

    enum_expression: ($) => prec(PREC.primary,
      prec.left(
        seq(
          field("root", $.identifier),
          ".",
          field("variant", $.field_identifier),
          ":",
          field("value", $.expression),
        ),
      )),

    extern_declaration: ($) => prec.left(
        seq(
          "extern",
          $.string_literal,
          "const",
          $.identifier,
          "=",
          $.data_type,
          optional(seq("from", $.string_literal)),
          optional(seq("as", $.string_literal)),
        )),
  

    stop_statement: ($) =>
      prec.right(
        50,
        choice("break", "continue", seq("return", optional($.expression))),
      ),

    object_expression: ($) => prec(170, $.key_value),

    pipe_expression: ($) =>
      prec.left(
        PREC.pipe,
        seq(
          $.statement,
          repeat1(seq(choice("|>", seq("|:", $.identifier, ">")), $.statement)),
        ),
      ),

    tagged_template_call: ($) =>
      prec.left(
        10,
        seq(
          field("caller", $.identifier),
          $.string_literal,
          optional(seq("<", "(", commaSep($.statement), ")")),
        ),
      ),

    key_value: ($) =>
      seq(
        "{",
        commaSep1(
          choice(
            field("value", $.identifier),
            seq(
              field("key", $.field_identifier),
              ":",
              field("value", $.statement),
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
            repeat1(field("name", $.identifier)),
            field("type", optional(seq(":", $.data_type))),
            field("default", optional(seq("=", $.expression))),
          ),
        ),
        ")",
      ),

    ffi_data_type: ($) =>
      seq(
        "@",
        choice(
          "u8",
          "i8",
          "u16",
          "i16",
          "u32",
          "i32",
          "u64",
          "i64",
          "usize",
          "isize",
          "uint",
          "int",
          "ushort",
          "short",
          "ulong",
          "long",
          "ulonglong",
          "longlong",
          "f32",
          "f64",
          "schar",
          "uchar",
        ),
      ),

    data_type: ($) =>
      prec(
        PREC.primary,
        choice(
          "null",
          "int",
          "uint",
          "float",
          "dyn",
          "bool",
          "str",
          "char",
          "range",
          "struct",
          $.ffi_data_type,
          $.pointer_type,
          $.reference_type,
          $.tuple_type,
          $.scoped_type,
          $.result_type,
          $.list_type,
          $.optional_type,
          $.function_type,
          $.generic_type,
          $.type_identifier,
        ),
      ),

    pointer_type: ($) => seq("ptr", optional(seq(":<", $.data_type, ">"))),
    reference_type: ($) => prec.left(seq($.mutability, $.data_type)),
    tuple_type: ($) => seq("<", commaSep1($.data_type), ">"),
    scoped_type: ($) => seq($.scope_identifier, "::", $.data_type),
    result_type: ($) => choice(seq("!", $.data_type), seq($.data_type, "!"), seq($.data_type, "!", $.data_type)),
    list_type: ($) => seq("list", optional(seq(":<", $.data_type, ">"))),
    optional_type: ($) => seq($.data_type, "?"),
    function_type: ($) =>
      seq(
        "fn",
        "(",
        optional(commaSep1($.data_type)),
        ")",
        "->",
        $.data_type,
      ),
    generic_type: ($) => seq($.type_identifier, ":<", commaSep1($.data_type), ">"),

    ternary: ($) =>
      prec(
        PREC.primary,
        prec.left(
          seq("(", $.expression, ")", "?", $.expression, ":", $.expression),
        ),
      ),

    assignment_expression: ($) =>
      prec.left(
        seq(
          field("left", choice($.identifier, $.member_expression, $.ternary)),
          field("operator", choice(...assignmentOperators)),
          field("right", $.statement),
        ),
      ),

    try_expression: ($) =>
      prec(
        PREC.primary,
        prec.left(
          seq(
            "try",
            $.expression,
            optional(seq(optional(seq(":", $.identifier)), $.block)),
          ),
        ),
      ),

    emit_expression: ($) => prec(PREC.primary, seq("emit", $.expression)),

    debug_expression: ($) => prec(PREC.primary, seq("debug", $.expression)),

    not_expression: ($) =>
      prec(
        PREC.unary,
        seq(field("operator", choice("-", "!")), field("operand", $.statement)),
      ),

    call_expression: ($) =>
      prec(
        PREC.primary,
        seq(
          field("caller", $.identifier),
          optional(seq(":<", commaSep1($.data_type), ">")),
          field("args", $.argument_list),
        ),
      ),

    argument_list: ($) =>
      choice(seq("(", commaSep($.statement), ")"), $.string_literal),

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
            field("left", $.expression),
            op,
            field("right", $.expression),
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
            field("left", $.expression),
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
            field("left", $.expression),
            op,
            field("type", $.statement),
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
