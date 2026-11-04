import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<>"'`]+)/gi;

function splitTrailingPunctuation(rawUrl: string): {
  cleanUrl: string;
  trailing: string;
} {
  let cleanUrl = rawUrl;
  let trailing = "";

  while (cleanUrl.length > 0 && /[.,!?;:)\]]$/.test(cleanUrl)) {
    trailing = cleanUrl.slice(-1) + trailing;
    cleanUrl = cleanUrl.slice(0, -1);
  }

  return { cleanUrl, trailing };
}

export function SafeLinkifiedText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(URL_REGEX.source, "gi");
  let keyCounter = 0;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const rawMatch = match[0];

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const { cleanUrl, trailing } = splitTrailingPunctuation(rawMatch);

    let isValidHttp = false;
    try {
      const parsed = new URL(cleanUrl);
      isValidHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      isValidHttp = false;
    }

    if (isValidHttp) {
      parts.push(
        <a
          key={`link-${keyCounter++}`}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 underline break-all hover:text-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
        >
          {cleanUrl}
        </a>
      );
      if (trailing) {
        parts.push(trailing);
      }
    } else {
      parts.push(rawMatch);
    }

    lastIndex = start + rawMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>{parts}</p>
  );
}

