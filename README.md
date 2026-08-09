# react-faq-accordion

Animated React FAQ accordion built on the native `<details>` element — so the answer text
stays in your server-rendered HTML.

Most animated accordions replace `<details>` with `div` + state, because `<details>` hides its
content instantly and kills the closing animation. That trade has a cost people rarely measure:
the answer text is either missing from the server-rendered HTML or hidden behind hydration.
Crawlers that don't execute JavaScript — `GPTBot`, `ClaudeBot`, `PerplexityBot`, and plenty of
link previewers — then see a list of questions with no answers. FAQ blocks are among the most
quoted content on a marketing site, so that is a real loss.

This component keeps `<details>` and animates around it: on close, the `open` attribute is
removed **after** the height animation finishes, not before.

- **Zero runtime dependencies.** No animation library. Height is animated with the Web Animations API.
- **Works without JavaScript.** If JS never runs, the browser's own `<details>` toggle still works.
- **Yours to style.** Ship your own classes through `classNames`, or import the optional stylesheet.
- **~2 kB** minified, tree-shakeable, TypeScript types included.

Used in production at [atekian.com](https://atekian.com) — see the
[FAQ page](https://atekian.com/sss) and view source: every answer is in the HTML.

## Install

```bash
npm install react-faq-accordion
```

## Usage

```tsx
import { FaqAccordion } from "react-faq-accordion";
import "react-faq-accordion/styles.css"; // optional

const items = [
  {
    question: "How long does it take to launch an MVP?",
    answer: "An MVP with a single verifiable flow typically ships in 4-6 weeks.",
  },
  {
    question: "Who owns the source code?",
    answer: "You do. The repository is created under your account from day one.",
  },
];

export function Faq() {
  return <FaqAccordion items={items} />;
}
```

### Rendered markup

```html
<div class="rfa-root">
  <details class="rfa-item" data-state="closed">
    <summary class="rfa-trigger" data-state="closed">
      <span class="rfa-question">How long does it take to launch an MVP?</span>
      <span class="rfa-icon" aria-hidden="true" data-state="closed">…</span>
    </summary>
    <div class="rfa-panel" data-state="closed">
      <div class="rfa-content">An MVP with a single verifiable flow…</div>
    </div>
  </details>
</div>
```

Every part carries `data-state="open" | "closed"`, so you can style states with CSS alone —
including Tailwind's `data-[state=open]:` variants — without wiring any JavaScript.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `FaqAccordionItem[]` | — | `{ question, answer, id? }`. Both accept any `ReactNode`. |
| `allowMultiple` | `boolean` | `false` | Allow several items open at once. |
| `defaultOpen` | `number \| number[]` | — | Open on first render. Reflected in server-rendered HTML. |
| `duration` | `number` | `420` | Animation duration in ms. `0` disables it. |
| `easing` | `string` | `cubic-bezier(0.22, 1, 0.36, 1)` | Any CSS easing value. |
| `classNames` | `FaqAccordionClassNames` | — | `{ root, item, trigger, question, icon, panel, content }`. |
| `renderIcon` | `(s: { open, index }) => ReactNode` | plus → cross | Replace the default icon. |
| `onToggle` | `(index: number, open: boolean) => void` | — | Fires on user toggle. |
| `reduceMotion` | `boolean` | — | Force-disable animation. When omitted, `prefers-reduced-motion` is respected. |

## Styling with your own classes

```tsx
<FaqAccordion
  items={items}
  classNames={{
    item: "group border-b border-white/10",
    trigger: "py-7 text-lg font-semibold text-zinc-200",
    icon: "h-9 w-9 rounded-full border border-white/12 group-data-[state=open]:border-white/35",
    content: "pb-8 text-zinc-400 leading-relaxed",
  }}
/>
```

## FAQPage structured data

The package ships a small helper so the schema and the visible list come from the same array —
which is the rule Google's structured data policy actually cares about:

```tsx
import { faqPageJsonLdString } from "react-faq-accordion";

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: faqPageJsonLdString(items, {
      url: "https://example.com/faq",
      inLanguage: "en-US",
    }),
  }}
/>;
```

> Only pass questions that are visible on the page. A hidden "SEO-only" list is a policy
> violation, not an optimization.

## Accessibility notes

- `summary` is a natively focusable, keyboard-operable control — no `role`/`tabIndex` patching.
- Expanded state is exposed by the `details` element itself; assistive tech reads it natively.
- The icon is `aria-hidden`, so the question text is announced alone.
- Animation is skipped entirely under `prefers-reduced-motion: reduce`.

## Server-side rendering

Nothing to configure. The component renders the full markup on the server; the only client-side
work is toggling. With `defaultOpen`, the matching items carry the `open` attribute in the HTML
that leaves your server.

## License

MIT © [Atekian](https://atekian.com)
