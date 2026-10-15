// Runs inside the throwaway project that smoke.mjs creates, so every import
// below resolves from that project's node_modules, as it would for an npm user.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement as h, version } from "react";
import { renderToString } from "react-dom/server";
import { FaqAccordion, faqPageJsonLdString } from "react-faq-accordion";

const items = [
  { question: "Is the answer in the HTML?", answer: "Yes, every answer is rendered on the server." },
  { question: "Does it need JavaScript to open?", answer: "No, the native details element does that." },
  { question: "Can several items stay open?", answer: "Yes, pass allowMultiple." },
];

const html = renderToString(h(FaqAccordion, { items, defaultOpen: 1 }));
const missing = items.filter((item) => !html.includes(item.answer));
if (missing.length > 0) {
  const answers = missing.map((item) => item.answer).join(" / ");
  throw new Error(`Answers missing from the server HTML: ${answers}\n${html}`);
}

const openItems = html.match(/<details[^>]*\sopen=""/g) ?? [];
if (openItems.length !== 1) {
  throw new Error(`defaultOpen should put "open" on 1 item, found ${openItems.length}.\n${html}`);
}

const jsonLd = JSON.parse(faqPageJsonLdString(items));
if (jsonLd.mainEntity?.length !== items.length) {
  throw new Error(`faqPageJsonLdString didn't list every question: ${JSON.stringify(jsonLd)}`);
}

const styles = fileURLToPath(import.meta.resolve("react-faq-accordion/styles.css"));
if (!existsSync(styles)) {
  throw new Error(`styles.css is missing from the package: ${styles}`);
}

console.log(`ok: React ${version} rendered all ${items.length} answers on the server`);
