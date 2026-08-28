"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ImageIcon } from "@/components/icons";

export type MediaItem = {
  id: string;
  url: string;
  caption: string | null;
};

export function MediaGallery({ items }: { items: MediaItem[] }) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight")
        setActive((i) => (i === null ? null : (i + 1) % items.length));
      if (e.key === "ArrowLeft")
        setActive((i) =>
          i === null ? null : (i - 1 + items.length) % items.length,
        );
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active, items.length]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-2)] p-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] text-muted mb-2">
          <ImageIcon size={18} />
        </div>
        <p className="text-sm text-muted">No media uploaded for this project yet.</p>
      </div>
    );
  }

  const hero = items[0];
  const rest = items.slice(1);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActive(0)}
          className="md:col-span-2 md:row-span-2 group relative aspect-[16/10] md:aspect-auto md:h-full overflow-hidden rounded-2xl bg-[color:var(--surface-inset)] border border-[color:var(--border)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.url}
            alt={hero.caption ?? "Project media"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
          {hero.caption && (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-xs text-white/90">{hero.caption}</p>
            </div>
          )}
        </button>
        {rest.slice(0, 4).map((m, i) => {
          const idx = i + 1;
          const showMore = idx === 4 && items.length > 5;
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => setActive(idx)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-[color:var(--surface-inset)] border border-[color:var(--border)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt={m.caption ?? "Project media"}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />
              {showMore && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm font-semibold">
                  +{items.length - 5}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {active !== null && (
        <Lightbox
          items={items}
          index={active}
          onClose={() => setActive(null)}
          onPrev={() =>
            setActive((i) =>
              i === null ? null : (i - 1 + items.length) % items.length,
            )
          }
          onNext={() =>
            setActive((i) => (i === null ? null : (i + 1) % items.length))
          }
        />
      )}
    </>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <CloseIcon size={18} />
      </button>
      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRightIcon size={20} />
          </button>
        </>
      )}
      <div
        className="max-h-[85vh] max-w-6xl w-full flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.caption ?? "Project media"}
          className="max-h-[80vh] max-w-full object-contain rounded-xl"
        />
        {item.caption && (
          <p className="text-xs text-white/70 text-center">{item.caption}</p>
        )}
        <p className="text-[10px] uppercase tracking-widest text-white/50">
          {index + 1} / {items.length}
        </p>
      </div>
    </div>
  );
}
