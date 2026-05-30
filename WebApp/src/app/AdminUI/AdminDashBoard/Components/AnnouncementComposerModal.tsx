"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";

type AnnouncementLink = {
  label: string;
  url: string;
};

type AnnouncementComposerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const MAX_IMAGES = 8;

const emptyLink = (): AnnouncementLink => ({ label: "", url: "" });

const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

const renderLinkedText = (text: string) => {
  if (!text.trim()) {
    return <span className="text-gray-400">Your announcement preview will appear here.</span>;
  }

  const parts = text.split(urlPattern);

  return parts.map((part, index) => {
    if (!part) return null;

    const isUrl = urlPattern.test(part);
    urlPattern.lastIndex = 0;

    if (isUrl) {
      const href = part.startsWith("www.") ? `https://${part}` : part;
      return (
        <a
          key={`${part}-${index}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#113F67] underline decoration-[#113F67]/30 underline-offset-4 hover:decoration-[#113F67]"
        >
          {part}
        </a>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

export default function AnnouncementComposerModal({ isOpen, onClose, onSuccess }: AnnouncementComposerModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<AnnouncementLink[]>([emptyLink()]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle("");
    setDescription("");
    setLinks([emptyLink()]);
    setImages([]);
    setError(null);
    setLoading(false);
  }, [isOpen]);

  useEffect(() => {
    const nextPreviews = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [images]);

  const activeLinks = useMemo(
    () =>
      links
        .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
        .filter((link) => link.url.length > 0),
    [links]
  );

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextImages = Array.from(event.target.files || []).slice(0, MAX_IMAGES);
    setImages(nextImages);
  };

  const handleLinkChange = (index: number, field: keyof AnnouncementLink, value: string) => {
    setLinks((prev) => prev.map((link, linkIndex) => (linkIndex === index ? { ...link, [field]: value } : link)));
  };

  const addLinkRow = () => {
    setLinks((prev) => [...prev, emptyLink()]);
  };

  const removeLinkRow = (index: number) => {
    setLinks((prev) => {
      if (prev.length <= 1) {
        return [emptyLink()];
      }

      return prev.filter((_, linkIndex) => linkIndex !== index);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      setError("Title and description are required.");
      return;
    }

    try {
      setLoading(true);

      const payload = new FormData();
      payload.append("title", trimmedTitle);
      payload.append("description", trimmedDescription);

      if (activeLinks.length > 0) {
        payload.append("links", JSON.stringify(activeLinks));
      }

      images.forEach((file) => {
        payload.append("announcement_images", file);
      });

      const response = await fetch(`${API_URL}/announcements`, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
        },
        body: payload,
      });

      const responseData = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseData?.error || responseData?.message || "Failed to create announcement.");
      }

      onSuccess();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create announcement.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#113F67]/60">Admin Composer</p>
            <h2 className="text-2xl font-bold text-[#113F67]">Create Announcement</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close announcement composer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Lab closure for system maintenance"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#113F67] focus:ring-2 focus:ring-[#113F67]/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={8}
                placeholder="Write the full announcement here. Paste website or Facebook links directly into the text and they will become clickable."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#113F67] focus:ring-2 focus:ring-[#113F67]/10"
              />
              <p className="mt-2 text-xs text-slate-500">
                URLs added in the description render as links in the published card.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-700">Related links</label>
                <button
                  type="button"
                  onClick={addLinkRow}
                  className="inline-flex items-center gap-1 rounded-full border border-[#113F67]/15 px-3 py-1.5 text-xs font-semibold text-[#113F67] transition-colors hover:bg-[#113F67]/5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add link
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {links.map((link, index) => (
                  <div key={`announcement-link-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1.2fr_auto]">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(event) => handleLinkChange(index, "label", event.target.value)}
                      placeholder="Link label"
                      className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#113F67] focus:ring-2 focus:ring-[#113F67]/10"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(event) => handleLinkChange(index, "url", event.target.value)}
                      placeholder="https://example.com"
                      className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#113F67] focus:ring-2 focus:ring-[#113F67]/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeLinkRow(index)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-slate-500 transition-colors hover:bg-white hover:text-red-600"
                      aria-label={`Remove link ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#113F67] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0d2f4d]"
              />
              <p className="mt-2 text-xs text-slate-500">
                Upload up to {MAX_IMAGES} images. The first one becomes the preview hero.
              </p>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {imagePreviews.map((previewUrl, index) => (
                  <div key={previewUrl} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img src={previewUrl} alt={`Selected announcement image ${index + 1}`} className="h-24 w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">
                Announcements are published immediately after saving and appear on the homepage feed.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#113F67] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#113F67]/20 transition-colors hover:bg-[#0d2f4d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Publishing..." : "Publish announcement"}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="rounded-3xl border border-[#113F67]/10 bg-white shadow-[0_20px_50px_rgba(17,63,103,0.08)]">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#113F67] text-sm font-bold text-white shadow-sm">
                    {title.trim().slice(0, 1).toUpperCase() || "A"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="rounded-full bg-[#113F67]/10 px-3 py-1 font-semibold text-[#113F67]">
                        Preview
                      </span>
                      <span>Just now</span>
                    </div>
                    <h3 className="mt-3 text-2xl font-bold leading-tight text-[#113F67]">
                      {title.trim() || "Announcement title"}
                    </h3>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-gray-700">
                    {renderLinkedText(description)}
                  </p>

                  {activeLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {activeLinks.map((link, index) => (
                        <span
                          key={`${link.url}-${index}`}
                          className="inline-flex items-center gap-1 rounded-full border border-[#113F67]/15 bg-[#113F67]/5 px-3 py-1.5 text-sm font-medium text-[#113F67]"
                        >
                          {link.label || link.url}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {imagePreviews.length > 0 ? (
                <div className="border-t border-[#113F67]/10 bg-slate-50 p-3">
                  <div className={`grid gap-3 ${imagePreviews.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                    {imagePreviews.slice(0, 4).map((previewUrl, index) => (
                      <div
                        key={`${previewUrl}-${index}`}
                        className={`overflow-hidden rounded-2xl bg-slate-100 ${index === 0 && imagePreviews.length > 1 ? "sm:col-span-2" : ""}`}
                      >
                        <img src={previewUrl} alt={`Preview image ${index + 1}`} className="h-full max-h-[320px] w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#113F67]/10 bg-gradient-to-br from-[#113F67]/5 to-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-[#113F67]">Image preview</p>
                  <p className="mt-2 text-sm text-slate-500">Add photos to make the announcement feel more like a social post.</p>
                  <div className="mt-5 rounded-2xl border border-dashed border-[#113F67]/15 bg-white px-4 py-12 text-sm text-slate-400">
                    No images selected yet
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}