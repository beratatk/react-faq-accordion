import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { faqPageJsonLd, faqPageJsonLdString } from "../dist/index.js";

// Text that would end the <script> element early, or open an HTML comment
// inside it, if "<" reached the page unescaped.
const items = [
  { question: "Is this safe?", answer: "</script><script>alert(1)</script>" },
  { question: "<!--<script>", answer: "Comment trick" },
];
const options = { url: "https://example.com/</script>", inLanguage: "en-US" };

test("faqPageJsonLdString escapes every < and keeps the data", () => {
  const json = faqPageJsonLdString(items, options);
  assert.ok(!json.includes("<"), json);
  assert.deepEqual(JSON.parse(json), faqPageJsonLd(items, options));
});

test("FAQ text can't close the JSON-LD script tag from the README", () => {
  const html = renderToStaticMarkup(
    h("script", {
      type: "application/ld+json",
      dangerouslySetInnerHTML: { __html: faqPageJsonLdString(items, options) },
    })
  );
  // The element's own closing tag is the only one, at the very end.
  assert.equal(html.indexOf("</script"), html.length - "</script>".length);
  assert.ok(!html.includes("<!--"), html);
});
