"use client";

import { useState } from "react";
import type { WatchLink } from "@prisma/client";
import { ExternalLink, Link as LinkIcon, Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { MAX_LINKS_PER_TITLE } from "@/lib/services/links";

export type DraftLink = {
  id?: number;
  label: string;
  url: string;
};

type LinkListProps = {
  links: WatchLink[];
  onAddLink: (input: { label: string; url: string }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateLink: (
    linkId: number,
    input: { label: string; url: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteLink: (linkId: number) => Promise<{ ok: boolean; error?: string }>;
  disabled?: boolean;
};

export function LinkList({
  links,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
  disabled = false,
}: LinkListProps) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isQuotaReached = links.length >= MAX_LINKS_PER_TITLE;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await onAddLink({ label: newLabel, url: newUrl });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Gagal menambah link.");
      return;
    }
    setNewLabel("");
    setNewUrl("");
    setAdding(false);
  }

  function startEdit(link: WatchLink) {
    setError(null);
    setEditingId(link.id);
    setEditLabel(link.label);
    setEditUrl(link.url);
  }

  async function handleUpdate(e: React.FormEvent, linkId: number) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await onUpdateLink(linkId, { label: editLabel, url: editUrl });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Gagal memperbarui link.");
      return;
    }
    setEditingId(null);
  }

  async function handleDelete(linkId: number) {
    setError(null);
    setBusy(true);
    const res = await onDeleteLink(linkId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Gagal menghapus link.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <LinkIcon className="w-4 h-4 text-ink-muted" aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Link Tempat Menonton ({links.length}/{MAX_LINKS_PER_TITLE})
          </h3>
        </div>
        {!adding && !isQuotaReached && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setError(null);
              setAdding(true);
            }}
            className="min-h-11 px-3 rounded-pill bg-surface-soft hover:bg-line/60 text-xs font-semibold text-ink inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tambah Link</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-input bg-error-bg text-status-dropped-fg text-xs font-medium"
        >
          {error}
        </div>
      )}

      {links.length === 0 && !adding && (
        <p className="text-xs text-ink-muted py-2">
          Belum ada link tempat menonton untuk judul ini.
        </p>
      )}

      <ul className="space-y-2">
        {links.map((link) => {
          const isEditing = editingId === link.id;
          if (isEditing) {
            return (
              <li
                key={link.id}
                className="p-3 rounded-input bg-surface-soft border border-line space-y-2"
              >
                <form onSubmit={(e) => handleUpdate(e, link.id)} className="space-y-2">
                  <div>
                    <label
                      htmlFor={`edit-link-label-${link.id}`}
                      className="block text-xs font-medium text-ink mb-1"
                    >
                      Label Platform
                    </label>
                    <input
                      id={`edit-link-label-${link.id}`}
                      type="text"
                      maxLength={40}
                      required
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full h-11 px-3 rounded-input bg-surface text-sm text-ink border border-line focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-link-url-${link.id}`}
                      className="block text-xs font-medium text-ink mb-1"
                    >
                      URL Menonton (http/https)
                    </label>
                    <input
                      id={`edit-link-url-${link.id}`}
                      type="url"
                      maxLength={2048}
                      required
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full h-11 px-3 rounded-input bg-surface text-sm text-ink border border-line focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      className="min-h-11 px-3 rounded-pill bg-surface border border-line text-xs font-medium text-ink inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Batal</span>
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="min-h-11 px-4 rounded-pill bg-cta-gradient text-xs font-semibold text-ink inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Simpan</span>
                    </button>
                  </div>
                </form>
              </li>
            );
          }

          return (
            <li
              key={link.id}
              className="flex items-center justify-between gap-2 pl-4 pr-2 py-1.5 rounded-pill bg-surface-soft border border-line"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 flex-1 py-1.5 text-sm font-medium text-ink hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
              >
                <span className="truncate">{link.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />
              </a>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => startEdit(link)}
                  aria-label={`Ubah link ${link.label}`}
                  className="w-11 h-11 rounded-pill inline-flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => handleDelete(link.id)}
                  aria-label={`Hapus link ${link.label}`}
                  className="w-11 h-11 rounded-pill inline-flex items-center justify-center text-red-500 hover:bg-error-bg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {adding && (
        <form
          onSubmit={handleCreate}
          className="p-3.5 rounded-card bg-surface-soft border border-line space-y-2.5"
        >
          <div>
            <label
              htmlFor="new-link-label"
              className="block text-xs font-medium text-ink mb-1"
            >
              Label Platform (maks 40 karakter)
            </label>
            <input
              id="new-link-label"
              type="text"
              maxLength={40}
              required
              placeholder="Mis. Netflix, Crunchyroll, YouTube"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full h-11 px-3 rounded-input bg-surface text-sm text-ink border border-line focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div>
            <label
              htmlFor="new-link-url"
              className="block text-xs font-medium text-ink mb-1"
            >
              URL Menonton (http/https)
            </label>
            <input
              id="new-link-url"
              type="url"
              maxLength={2048}
              required
              placeholder="https://www.netflix.com/title/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full h-11 px-3 rounded-input bg-surface text-sm text-ink border border-line focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="min-h-11 px-4 rounded-pill bg-surface border border-line text-xs font-medium text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 px-4 rounded-pill bg-cta-gradient text-xs font-semibold text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              {busy ? "Menyimpan..." : "Simpan Link"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

