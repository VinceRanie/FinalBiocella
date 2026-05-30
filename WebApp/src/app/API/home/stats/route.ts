import { NextResponse } from "next/server";

const DEFAULT_API_BASE_URL = "https://22102959.dcism.org/biocella-api";
const ENV_API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

type MicrobialItem = {
  classification?: string | null;
  publish_status?: string | null;
  image_url?: string | null;
};

type SpecimenTypeStat = {
  type: string;
  count: number;
  imageUrl?: string | null;
};

type AnnouncementLink = {
  label?: string | null;
  url?: string | null;
};

type AnnouncementItem = {
  title?: string | null;
  description?: string | null;
  image_urls?: string[] | null;
  links?: AnnouncementLink[] | null;
  created_at?: string | null;
  created_by_email?: string | null;
  created_by_role?: string | null;
};

type HomepageStats = {
  publishedSpecimens: number;
  carolinianCount: number;
  totalSpecimens: number;
  collectionCategories: number;
  specimenTypes: SpecimenTypeStat[];
  announcements: {
    title: string;
    description: string;
    image_urls: string[];
    links: { label: string; url: string }[];
    created_at: string | null;
    created_by_email: string;
    created_by_role: string;
  }[];
};

const isPublished = (item: MicrobialItem) => {
  const status = (item.publish_status || "published").toString().trim().toLowerCase();
  return status !== "unpublished";
};

const toSpecimenTypeStats = (items: MicrobialItem[]): SpecimenTypeStat[] => {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const typeRaw = (item.classification || "Unknown").toString().trim();
    const type = typeRaw.length > 0 ? typeRaw : "Unknown";
    counts.set(type, (counts.get(type) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
};

const toAbsoluteImageUrl = (apiBaseUrl: string, rawPath: string) => {
  const normalized = String(rawPath || "").trim();
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const base = apiBaseUrl.replace(/\/$/, "");
  if (normalized.startsWith("/")) {
    return `${base}${normalized}`;
  }
  return `${base}/${normalized}`;
};

const toAnnouncementImageUrl = (apiBaseUrl: string, rawPath: string) => toAbsoluteImageUrl(apiBaseUrl, rawPath);

const pickRandom = <T,>(items: T[]): T | null => {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
};

const getApiBaseCandidates = (): string[] => {
  const normalized = ENV_API_BASE_URL;
  const candidates = new Set<string>([normalized, DEFAULT_API_BASE_URL]);

  if (normalized.endsWith("/biocella-api")) {
    candidates.add(normalized.replace(/\/biocella-api$/, ""));
  } else {
    candidates.add(`${normalized}/biocella-api`);
  }

  return Array.from(candidates).filter(Boolean);
};

const tryParseJson = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getClassification = (item: MicrobialItem) => {
  const typeRaw = (item.classification || "Unknown").toString().trim();
  return typeRaw.length > 0 ? typeRaw : "Unknown";
};

const fetchJson = async (url: string) => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return await tryParseJson(response);
  } catch {
    return null;
  }
};

const fetchHomepageStats = async (apiBaseUrl: string): Promise<HomepageStats | null> => {
  const allMicrobialsData = await fetchJson(`${apiBaseUrl}/microbials?role=staff`);
  if (!Array.isArray(allMicrobialsData)) {
    return null;
  }

  const publishedMicrobialsData = await fetchJson(`${apiBaseUrl}/microbials?role=staff&publish_status=published`);
  const usersData = await fetchJson(`${apiBaseUrl}/auth/users`);
  const announcementsData = await fetchJson(`${apiBaseUrl}/announcements?limit=4`);
  const users = Array.isArray(usersData?.users) ? usersData.users : [];

  const allMicrobials = allMicrobialsData as MicrobialItem[];
  const publishedMicrobials = Array.isArray(publishedMicrobialsData)
    ? (publishedMicrobialsData as MicrobialItem[])
    : allMicrobials.filter(isPublished);

  const studentUsers = users.filter((user: { role?: string | null }) => {
    return String(user?.role || "").trim().toLowerCase() === "student";
  });

  const normalizedAllMicrobials = allMicrobials.map((item) => ({ ...item, classification: getClassification(item) }));
  const allSpecimenTypes = toSpecimenTypeStats(normalizedAllMicrobials);

  const publishedWithImages = publishedMicrobials
    .filter(isPublished)
    .map((item) => ({
      classification: getClassification(item),
      imageUrl: toAbsoluteImageUrl(apiBaseUrl, String(item.image_url || "")),
    }))
    .filter((item) => Boolean(item.imageUrl));

  const imagePoolByType = new Map<string, string[]>();
  publishedWithImages.forEach((item) => {
    if (!item.imageUrl) return;
    const bucket = imagePoolByType.get(item.classification) || [];
    bucket.push(item.imageUrl);
    imagePoolByType.set(item.classification, bucket);
  });

  const specimenTypesWithRandomImage = allSpecimenTypes.map((item) => {
    const imageCandidates = imagePoolByType.get(item.type) || [];
    const imageUrl = pickRandom(imageCandidates);
    return {
      ...item,
      imageUrl,
    };
  });

  const announcements = Array.isArray(announcementsData)
    ? (announcementsData as AnnouncementItem[])
        .map((item) => ({
          title: String(item.title || 'Announcement').trim() || 'Announcement',
          description: String(item.description || '').trim(),
          image_urls: Array.isArray(item.image_urls)
            ? item.image_urls
                .map((imageUrl) => toAnnouncementImageUrl(apiBaseUrl, String(imageUrl || '')))
                .filter((imageUrl): imageUrl is string => Boolean(imageUrl))
            : [],
          links: Array.isArray(item.links)
            ? item.links
                .map((link) => ({
                  label: String(link?.label || '').trim(),
                  url: String(link?.url || '').trim(),
                }))
                .filter((link) => Boolean(link.url))
            : [],
          created_at: item.created_at || null,
          created_by_email: String(item.created_by_email || '').trim(),
          created_by_role: String(item.created_by_role || 'admin').trim().toLowerCase(),
        }))
        .slice(0, 4)
    : [];

  return {
    publishedSpecimens: publishedMicrobials.filter(isPublished).length,
    carolinianCount: studentUsers.length,
    totalSpecimens: allMicrobials.length,
    collectionCategories: allSpecimenTypes.length,
    specimenTypes: specimenTypesWithRandomImage,
    announcements,
  };
};

export async function GET() {
  try {
    const apiBaseCandidates = getApiBaseCandidates();

    for (const apiBaseUrl of apiBaseCandidates) {
      try {
        const data = await fetchHomepageStats(apiBaseUrl);
        if (data) {
          return NextResponse.json(data);
        }
      } catch {
        // Continue trying other possible base URL variants.
      }
    }

    return NextResponse.json(
      {
        publishedSpecimens: 0,
        carolinianCount: 0,
        totalSpecimens: 0,
        collectionCategories: 0,
        specimenTypes: [],
        announcements: [],
        error: "Failed to fetch homepage stats",
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch homepage stats" },
      { status: 500 }
    );
  }
}
