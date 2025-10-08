/**
 * ESLint rule to block localStorage usage for critical data
 * This ensures that all data operations go through Supabase repositories
 */
module.exports = {
  rules: {
    "no-restricted-globals": [
      "error",
      {
        name: "localStorage",
        message:
          "localStorage usage is blocked. Use supabaseStorage or supabaseRepository instead for data operations.",
      },
      {
        name: "sessionStorage",
        message:
          "sessionStorage usage is blocked. Use supabaseStorage or supabaseRepository instead for data operations.",
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: 'MemberExpression[object.name="localStorage"]',
        message:
          "localStorage usage is blocked. Use supabaseStorage or supabaseRepository instead for data operations.",
      },
      {
        selector: 'MemberExpression[object.name="sessionStorage"]',
        message:
          "sessionStorage usage is blocked. Use supabaseStorage or supabaseRepository instead for data operations.",
      },
      {
        selector: 'CallExpression[callee.object.name="localStorage"]',
        message:
          "localStorage usage is blocked. Use supabaseStorage or supabaseRepository instead for data operations.",
      },
      {
        selector: 'CallExpression[callee.object.name="sessionStorage"]',
        message:
          "sessionStorage usage is blocked. Use supabaseStorage or supabaseRepository instead for data operations.",
      },
    ],
  },
};
