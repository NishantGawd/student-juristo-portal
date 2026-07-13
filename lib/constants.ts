// Removed db/utils import to prevent bringing node stream dependencies into client consts

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.PLAYWRIGHT ||
  process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

// Standard hardcoded bcrypt hash to use for dummy timing attacks
export const DUMMY_PASSWORD = "$2a$10$w6D8qO9B3r4hK2W9J8tO7eQqH8lGv1vHcJrJ8P1xY6wQj5yB4mE0G";

// Maps keywords in your DB slugs to the icon names used in your frontend
export const CATEGORY_ICON_MAP: Record<string, string> = {
  "business": "Briefcase",
  "corporate": "Building2",
  "employment": "Users",
  "hr": "Users",
  "real-estate": "Home",
  "personal": "Heart",
  "family": "Heart",
  "intellectual-property": "Scale",
  "technology": "Shield",
  "software": "Shield",
  "sales": "Briefcase",
  "services": "Users",
  "startups": "Building2",
  "funding": "Briefcase",
  "import-export": "Car",
  "logistics": "Car",
  "criminal": "Scale"
};

// Helper to get a clean label from a slug like "employment-hr" or "startups-funding"
export const formatCategoryLabel = (cat: string) => {
  if (!cat) return "Other";
  
  // Custom nice labels without "&" to keep UI clean
  const niceLabels: Record<string, string> = {
    "business-corporate": "Corporate",
    "employment-hr": "Employment",
    "real-estate": "Real Estate",
    "intellectual-property": "Intellectual Property",
    "startups-funding": "Startups",
    "import-export": "Import Export",
    "family-personal": "Personal",
    "business": "Business",
  };

  const normalized = cat.toLowerCase().trim();
  if (niceLabels[normalized]) return niceLabels[normalized];

  return normalized
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};