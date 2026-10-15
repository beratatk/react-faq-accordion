import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * A single question-and-answer item.
 * `question` and `answer` are ReactNodes, so rich content is allowed;
 * the JSON-LD helper (`faqPageJsonLd`) expects plain text.
 */
export interface FaqAccordionItem {
  question: ReactNode;
  answer: ReactNode;
  /** Stable React key. Falls back to the index when omitted. */
  id?: string;
}

export interface FaqAccordionClassNames {
  root?: string;
  item?: string;
  trigger?: string;
  question?: string;
  icon?: string;
  panel?: string;
  content?: string;
}

export interface FaqAccordionProps {
  items: FaqAccordionItem[];
  /** Whether several items can be open at once. Default: false (accordion). */
  allowMultiple?: boolean;
  /** Indexes open on first render. Also reflected in the server-rendered HTML. */
  defaultOpen?: number | number[];
  /** Open/close duration in ms. 0 disables the animation. */
  duration?: number;
  /** CSS easing value. */
  easing?: string;
  classNames?: FaqAccordionClassNames;
  /** Replaces the default plus/cross icon. */
  renderIcon?: (state: { open: boolean; index: number }) => ReactNode;
  onToggle?: (index: number, open: boolean) => void;
  /** Turns the animation off unconditionally. When omitted, prefers-reduced-motion is respected. */
  reduceMotion?: boolean;
}

const DEFAULT_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const cx = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(" ");

const toSet = (value: number | number[] | undefined): Set<number> => {
  if (value === undefined) return new Set();
  return new Set(Array.isArray(value) ? value : [value]);
};

/**
 * Animated FAQ accordion built on <details>.
 *
 * Why <details>: the answer text sits in the body of the server-rendered HTML
 * and can be expanded even when JavaScript doesn't run. Clients that don't run
 * JS (search engine and AI crawlers) see the FAQ content as is.
 *
 * To animate the close, the `open` attribute isn't removed right away: the
 * height first shrinks to zero, and the attribute is removed when the animation
 * ends. Otherwise the browser hides the content instantly and the close is never
 * seen.
 */
export function FaqAccordion({
  items,
  allowMultiple = false,
  defaultOpen,
  duration = 420,
  easing = DEFAULT_EASING,
  classNames,
  renderIcon,
  onToggle,
  reduceMotion,
}: FaqAccordionProps) {
  const [open, setOpen] = useState<Set<number>>(() => toSet(defaultOpen));
  // Frozen so the server render and the first client render stay identical.
  const initiallyOpen = useRef(toSet(defaultOpen)).current;

  const toggle = useCallback(
    (index: number) => {
      setOpen((current) => {
        const isOpen = current.has(index);
        const next = allowMultiple ? new Set(current) : new Set<number>();
        if (isOpen) next.delete(index);
        else next.add(index);
        onToggle?.(index, !isOpen);
        return next;
      });
    },
    [allowMultiple, onToggle]
  );

  if (items.length === 0) return null;

  return (
    <div className={cx("rfa-root", classNames?.root)}>
      {items.map((item, index) => (
        <FaqAccordionRow
          key={item.id ?? index}
          item={item}
          index={index}
          open={open.has(index)}
          initiallyOpen={initiallyOpen.has(index)}
          duration={duration}
          easing={easing}
          classNames={classNames}
          renderIcon={renderIcon}
          reduceMotion={reduceMotion}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}

function FaqAccordionRow({
  item,
  index,
  open,
  initiallyOpen,
  duration,
  easing,
  classNames,
  renderIcon,
  reduceMotion,
  onToggle,
}: {
  item: FaqAccordionItem;
  index: number;
  open: boolean;
  initiallyOpen: boolean;
  duration: number;
  easing: string;
  classNames?: FaqAccordionClassNames;
  renderIcon?: FaqAccordionProps["renderIcon"];
  reduceMotion?: boolean;
  onToggle: (index: number) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    const details = detailsRef.current;
    const panel = panelRef.current;
    if (!details || !panel) return;

    // First render: the DOM is already in the right state, so don't animate.
    if (firstRun.current) {
      firstRun.current = false;
      details.open = open;
      return;
    }

    const prefersReduced =
      reduceMotion ??
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    const animatable = duration > 0 && !prefersReduced && typeof panel.animate === "function";

    animationRef.current?.cancel();

    if (open) {
      details.open = true;
      if (!animatable) return;
      const target = panel.offsetHeight;
      animationRef.current = panel.animate(
        [
          { height: "0px", opacity: 0 },
          { height: `${target}px`, opacity: 1 },
        ],
        { duration, easing }
      );
      return;
    }

    if (!animatable) {
      details.open = false;
      return;
    }

    const start = panel.offsetHeight;
    const animation = panel.animate(
      [
        { height: `${start}px`, opacity: 1 },
        { height: "0px", opacity: 0 },
      ],
      { duration, easing }
    );
    animationRef.current = animation;
    animation.onfinish = () => {
      details.open = false;
    };
  }, [open, duration, easing, reduceMotion]);

  useEffect(() => () => animationRef.current?.cancel(), []);

  const state = open ? "open" : "closed";

  return (
    <details
      ref={detailsRef}
      // React doesn't manage `open`; the attribute is set imperatively so
      // the close can animate. The value here only decides the server
      // output and the first render.
      open={initiallyOpen || undefined}
      data-state={state}
      className={cx("rfa-item", classNames?.item)}
    >
      <summary
        data-state={state}
        className={cx("rfa-trigger", classNames?.trigger)}
        // The two rules the component needs to work are inlined, so it
        // behaves correctly even without the optional stylesheet.
        // (Safari's ::-webkit-details-marker rule lives in styles.css.)
        style={{ listStyle: "none", cursor: "pointer" }}
        onClick={(event) => {
          // Without JavaScript this line never runs, and the browser's own
          // <details> behaviour takes over.
          event.preventDefault();
          onToggle(index);
        }}
      >
        <span className={cx("rfa-question", classNames?.question)}>{item.question}</span>
        <span aria-hidden="true" data-state={state} className={cx("rfa-icon", classNames?.icon)}>
          {renderIcon ? (
            renderIcon({ open, index })
          ) : (
            <>
              <span className="rfa-icon-bar rfa-icon-bar-h" />
              <span className="rfa-icon-bar rfa-icon-bar-v" />
            </>
          )}
        </span>
      </summary>

      <div
        ref={panelRef}
        data-state={state}
        className={cx("rfa-panel", classNames?.panel)}
        style={{ overflow: "hidden" }}
      >
        <div className={cx("rfa-content", classNames?.content)}>{item.answer}</div>
      </div>
    </details>
  );
}
