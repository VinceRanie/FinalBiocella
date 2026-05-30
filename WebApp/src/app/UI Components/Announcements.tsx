"use client";

import { motion } from "framer-motion";
import { API_URL } from "@/config/api";

type AnnouncementLink = {
  label: string;
  url: string;
};

type AnnouncementCard = {
  announcement_id?: number;
  title: string;
  description: string;
  image_urls: string[];
  links: AnnouncementLink[];
  created_at: string | null;
  created_by_email: string;
  created_by_role: string;
};

type AnnouncementsProps = {
  announcements?: AnnouncementCard[];
};

const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

const formatRelativeDate = (value: string | null) => {
  if (!value) return "Recently posted";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently posted";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeImageUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const renderLinkedText = (text: string) => {
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

export default function Announcements({ announcements = [] }: AnnouncementsProps) {
  const visibleAnnouncements = announcements.slice(0, 4);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: false }}
      id="Announcements"
      className="relative overflow-hidden py-16 px-4 bg-[#f7fbff]"
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#113F67]/10 to-transparent" />
      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#113F67]/70">Latest Updates</p>
          <h2 className="text-4xl font-bold text-[#113F67] mt-3 mb-4">Announcements</h2>
          <p className="max-w-2xl mx-auto text-gray-600">
            Important lab updates, research notices, and official posts appear here so visitors can catch up quickly.
          </p>
          <div className="w-24 h-1 bg-[#113F67] mx-auto rounded-full mt-6" />
        </div>

        {visibleAnnouncements.length === 0 ? (
          <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-[#113F67]/20 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#113F67]">No announcements yet</p>
            <p className="mt-2 text-sm text-gray-600">
              Check back soon for laboratory updates, event notices, and new research highlights.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {visibleAnnouncements.map((announcement, index) => {
              const hasImages = announcement.image_urls.length > 0;

              return (
                <motion.article
                  key={`${announcement.title}-${index}`}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  viewport={{ once: false }}
                  className="overflow-hidden rounded-3xl border border-[#113F67]/10 bg-white shadow-[0_20px_50px_rgba(17,63,103,0.08)]"
                >
                  <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#113F67] text-sm font-bold text-white shadow-sm">
                        {announcement.title.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="rounded-full bg-[#113F67]/10 px-3 py-1 font-semibold text-[#113F67]">Official post</span>
                          <span>{formatRelativeDate(announcement.created_at)}</span>
                          <span>by {announcement.created_by_role || "admin"}</span>
                        </div>
                        <h3 className="mt-3 text-2xl font-bold leading-tight text-[#113F67]">{announcement.title}</h3>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <p className="whitespace-pre-wrap text-[15px] leading-7 text-gray-700">{renderLinkedText(announcement.description)}</p>

                      {announcement.links.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {announcement.links.map((link, linkIndex) => (
                            <a
                              key={`${link.url}-${linkIndex}`}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-[#113F67]/15 bg-[#113F67]/5 px-3 py-1.5 text-sm font-medium text-[#113F67] transition-colors hover:bg-[#113F67]/10"
                            >
                              {link.label || link.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {hasImages && (
                    <div className="border-t border-[#113F67]/10 bg-slate-50 p-3 sm:p-4">
                      <div className={`grid gap-3 ${announcement.image_urls.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                        {announcement.image_urls.slice(0, 4).map((imageUrl, imageIndex) => (
                          <div
                            key={`${imageUrl}-${imageIndex}`}
                            className={`overflow-hidden rounded-2xl bg-slate-100 ${imageIndex === 0 && announcement.image_urls.length > 1 ? "sm:col-span-2" : ""}`}
                          >
                            <img src={normalizeImageUrl(imageUrl)} alt={`${announcement.title} attachment ${imageIndex + 1}`} className="h-full w-full max-h-[320px] object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 border-t border-[#113F67]/10 px-6 py-4 text-xs text-gray-500 sm:px-7">
                    <span>{announcement.created_by_email || "admin@biocella"}</span>
                    <span>Shareable update card</span>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}