/**
 * FAQPage JSON-LD üreticisi.
 *
 * Kural: schema'ya giren her soru ve cevap sayfada **görünür** olmalı.
 * Bu yüzden üreticiye akordiyonda gösterdiğiniz listenin aynısını verin;
 * gizli bir "SEO listesi" oluşturmayın — Google'ın yapılandırılmış veri
 * politikası bunu ihlal sayar.
 */
export interface FaqPlainItem {
  question: string;
  answer: string;
}

export interface FaqPageJsonLdOptions {
  /** Sayfanın mutlak adresi — @id üretmek için. */
  url?: string;
  /** "tr-TR", "en-US" gibi. */
  inLanguage?: string;
}

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

/** <script type="application/ld+json"> içine konacak hazır dize. */
export function faqPageJsonLdString(
  items: FaqPlainItem[],
  options?: FaqPageJsonLdOptions
): string {
  return JSON.stringify(faqPageJsonLd(items, options));
}
