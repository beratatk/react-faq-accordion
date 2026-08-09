import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Bir soru-cevap kalemi.
 * `question` ve `answer` ReactNode olduğu için zengin içerik geçilebilir;
 * JSON-LD üreticisi (`faqPageJsonLd`) düz metin bekler.
 */
export interface FaqAccordionItem {
  question: ReactNode;
  answer: ReactNode;
  /** Kararlı React anahtarı. Verilmezse index kullanılır. */
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
  /** Birden çok kalem aynı anda açık kalabilsin mi. Varsayılan: false (akordiyon). */
  allowMultiple?: boolean;
  /** İlk render'da açık gelecek index'ler. Sunucuda üretilen HTML'e de yansır. */
  defaultOpen?: number | number[];
  /** Açılma/kapanma süresi (ms). 0 verilirse animasyon kapanır. */
  duration?: number;
  /** CSS easing değeri. */
  easing?: string;
  classNames?: FaqAccordionClassNames;
  /** Varsayılan artı/çarpı ikonunu değiştirir. */
  renderIcon?: (state: { open: boolean; index: number }) => ReactNode;
  onToggle?: (index: number, open: boolean) => void;
  /** Animasyonu koşulsuz kapatır. Verilmezse prefers-reduced-motion dinlenir. */
  reduceMotion?: boolean;
}

const DEFAULT_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const cx = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(" ");

const toSet = (value: number | number[] | undefined): Set<number> => {
  if (value === undefined) return new Set();
  return new Set(Array.isArray(value) ? value : [value]);
};

/**
 * <details> tabanlı, animasyonlu SSS akordiyonu.
 *
 * Neden <details>: cevap metni sunucuda üretilen HTML'in gövdesinde yer alır ve
 * JavaScript çalışmadığında da açılabilir. JS çalıştırmayan tarayıcılar (arama
 * motoru ve yapay zeka crawler'ları) SSS içeriğini olduğu gibi görür.
 *
 * Kapanma animasyonu için `open` özniteliği hemen kaldırılmaz: önce yükseklik
 * sıfıra iner, animasyon bitince öznitelik kaldırılır. Aksi halde tarayıcı
 * içeriği anında gizlediği için kapanış görünmez.
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
  // Sunucu ve ilk istemci render'ının aynı kalması için dondurulur.
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

    // İlk render: DOM zaten doğru durumda, animasyon çalıştırma.
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
      // `open` React tarafından yönetilmez; kapanış animasyonu için
      // öznitelik imperatif olarak ayarlanır. Buradaki değer yalnızca
      // sunucu çıktısını ve ilk render'ı belirler.
      open={initiallyOpen || undefined}
      data-state={state}
      className={cx("rfa-item", classNames?.item)}
    >
      <summary
        data-state={state}
        className={cx("rfa-trigger", classNames?.trigger)}
        // Çalışması için zorunlu olan iki kural gömülü veriliyor; böylece
        // isteğe bağlı stylesheet alınmasa da bileşen doğru davranır.
        // (Safari'nin ::-webkit-details-marker kuralı styles.css içinde.)
        style={{ listStyle: "none", cursor: "pointer" }}
        onClick={(event) => {
          // JavaScript yoksa bu satır hiç çalışmaz ve tarayıcının kendi
          // <details> davranışı devreye girer.
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
