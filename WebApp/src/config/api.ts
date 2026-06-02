const DEFAULT_API_URL = "https://bioapi.dcism.org/biocella-api";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

const stripApiBasePath = (value: string) => value.replace(/\/biocella-api\/?$/, "");
export const UPLOADS_BASE_URL = stripApiBasePath(API_URL);
