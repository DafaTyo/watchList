"use client";

import { useState } from "react";

type PosterImageProps = {
  posterUrl?: string | null;
  name: string;
  className?: string;
  fallbackTextClassName?: string;
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function PosterImage({
  posterUrl,
  name,
  className = "",
  fallbackTextClassName = "text-xs font-bold",
}: PosterImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const trimmedUrl = posterUrl?.trim() || "";
  const showImage = Boolean(trimmedUrl) && failedUrl !== trimmedUrl;
  const isLoaded = loadedUrl === trimmedUrl;

  if (!showImage) {
    return (
      <div
        className={`bg-surface-soft text-ink flex items-center justify-center select-none border border-line ${className}`}
        aria-label={name}
      >
        <span className={fallbackTextClassName}>{getInitials(name)}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-surface-soft ${className}`}>
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 skeleton-shimmer"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={(el) => {
          if (el && el.complete && el.naturalWidth > 0 && loadedUrl !== trimmedUrl) {
            setLoadedUrl(trimmedUrl);
          }
        }}
        src={trimmedUrl}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoadedUrl(trimmedUrl)}
        onError={() => setFailedUrl(trimmedUrl)}
        className={`w-full h-full object-cover transition-all duration-300 ease-out ${
          isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[0.97]"
        }`}
      />
    </div>
  );
}
