/**
 * FAQPage JSON-LD helper.
 *
 * Rule: every question and answer in the schema must be **visible** on the page.
 * So pass the helper the same list you show in the accordion; don't build a
 * hidden "SEO list" — Google's structured data policy counts that as a
 * violation.
 */
export interface FaqPlainItem {
  question: string;
  answer: string;
}

export interface FaqPageJsonLdOptions {
  /** Absolute URL of the page, used to build the @id. */
  url?: string;
  /** For example "en-US" or "tr-TR". */
  inLanguage?: string;
}

/**
 * Builds the FAQPage object. To embed it in a <script> tag, use
 * faqPageJsonLdString: plain JSON.stringify leaves "<" unescaped.
 */
export function faqPageJsonLd(
  items: FaqPlainItem[],
  options: FaqPageJsonLdOptions = {}
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(options.url ? { "@id": `${options.url}#faq`, url: options.url } : {}),
    ...(options.inLanguage ? { inLanguage: options.inLanguage } : {}),
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * Ready-made string to put inside <script type="application/ld+json">.
 *
 * Every "<" is written as <, so FAQ text such as "</script>" or "<!--"
 * can't end the script element or open a comment in the page. The result is
 * still valid JSON and parses to the same data.
 */
export function faqPageJsonLdString(
  items: FaqPlainItem[],
  options?: FaqPageJsonLdOptions
): string {
  return JSON.stringify(faqPageJsonLd(items, options)).replace(/</g, "\\u003c");
}
