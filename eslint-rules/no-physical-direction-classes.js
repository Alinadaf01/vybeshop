const FORBIDDEN_PREFIX = /^(?:pl|pr|ml|mr|left|right)-/;
const FORBIDDEN_EXACT = new Set(["text-left", "text-right"]);

function forbiddenToken(token) {
  const base = token.split(":").pop();
  if (!base) return null;
  if (FORBIDDEN_EXACT.has(base)) return base;
  if (FORBIDDEN_PREFIX.test(base)) return base;
  return null;
}

function checkText(context, node, text) {
  if (typeof text !== "string") return;
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const hit = forbiddenToken(token);
    if (hit) {
      context.report({
        node,
        message: `Physical-direction utility "${hit}" is banned in this RTL project. Use logical properties instead (ps-/pe-/ms-/me-/start-/end-/text-start/text-end).`,
      });
    }
  }
}

export default {
  rules: {
    "no-physical-direction-classes": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow physical-direction Tailwind utilities (pl-/pr-/ml-/mr-/left-/right-/text-left/text-right) in favor of logical properties.",
        },
        schema: [],
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === "string") {
              checkText(context, node, node.value);
            }
          },
          TemplateElement(node) {
            checkText(context, node, node.value.raw);
          },
        };
      },
    },
  },
};
