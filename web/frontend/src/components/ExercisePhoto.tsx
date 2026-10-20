import { useEffect, useState } from "react";
import type { ExercisePhotoSet } from "../features/exercises/types";

export function ExercisePhoto({
  photos,
  imageIndex = 1,
  alt,
  variant = "fill",
  priority = false,
}: {
  photos: ExercisePhotoSet | null;
  imageIndex?: number;
  alt: string;
  variant?: "fill" | "thumbnail" | "gallery";
  priority?: boolean;
}) {
  const src = photos?.images[Math.min(imageIndex, (photos?.images.length ?? 1) - 1)];
  const [failed, setFailed] = useState(false);
  const frameClasses = {
    fill: "h-full w-full self-stretch",
    thumbnail: "h-18.5 w-16.5 shrink-0 rounded-[10px]",
    gallery: "aspect-4/3 w-full rounded-[18px]",
  };
  useEffect(() => {
    setFailed(false);
  }, [src]);
  useEffect(() => {
    const retry = () => setFailed(false);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);
  return (
    <div className={`overflow-hidden bg-[#f5f5f2] ${frameClasses[variant]}`}>
      {src && !failed ? (
        <img className={`block h-full w-full ${variant === "thumbnail" ? "object-cover" : "object-contain"}`}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`grid h-full w-full place-items-center p-3 text-center text-[11px] leading-[1.5] text-[#5d6557] ${variant === "gallery" ? "min-h-55" : "min-h-18.5"}`}
          role="img"
          aria-label={`${alt || "Exercise photo"} unavailable`}
        >
          {navigator.onLine ? "Photo unavailable" : "Photo unavailable offline"}
        </div>
      )}
    </div>
  );
}

export function PhotoCredit({
  photos,
  prefix = "Photo",
  note = "Resized for display; thumbnails cropped to fit.",
}: {
  photos: ExercisePhotoSet | null;
  prefix?: string;
  note?: string;
}) {
  if (!photos) return null;
  return (
    <p className="text-[10px] leading-[1.8] text-muted mt-3.5">
      {prefix}:{" "}
      <a className="underline underline-offset-3" href={photos.creditUrl} target="_blank" rel="noopener noreferrer">
        {photos.credit}
      </a>{" "}
      ·{" "}
      <a className="underline underline-offset-3" href={photos.licenseUrl} target="_blank" rel="noopener noreferrer">
        {photos.license}
      </a>{" "}
      ·{" "}
      <a className="underline underline-offset-3" href={photos.sourceUrl} target="_blank" rel="noopener noreferrer">
        Source
      </a>
      <span className="block mt-[3px]">{note}</span>
    </p>
  );
}

export function ExerciseGallery({
  photos,
  name,
}: {
  photos: ExercisePhotoSet;
  name: string;
}) {
  const [selected, setSelected] = useState(0);
  return (
    <figure className="min-w-0">
      <ExercisePhoto
        variant="gallery"
        photos={photos}
        imageIndex={selected}
        alt={`${name} demonstration, photo ${selected + 1}`}
      />
      {photos?.images.length > 1 && (
        <div
          className="flex gap-5 py-[3px] px-0 border-b border-b-[#ffffff12]"
          role="group"
          aria-label="Exercise demonstration photos"
        >
          {photos.images.map((src, index) => (
            <button className="min-h-11 py-2 px-[3px] text-xs text-muted border-b-2 border-b-transparent aria-[pressed=true]:text-accent aria-[pressed=true]:border-accent"
              key={src}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              Photo {index + 1}
            </button>
          ))}
        </div>
      )}
      <figcaption>
        {photos?.variation && (
          <p className="text-xs leading-[1.7] text-[#c4ccba] mt-[15px]">{photos.variation}</p>
        )}
        <PhotoCredit photos={photos} />
      </figcaption>
    </figure>
  );
}
