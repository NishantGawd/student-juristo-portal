/**
 * Determines if a string is an S3 URL
 */
function isS3Url(url: string): boolean {
  return url.includes(".s3.") || url.includes("s3.amazonaws.com") || (url.startsWith("https://") && url.includes("amazonaws"));
}

/**
 * Fetches and extracts text content from an S3 URL via server-side API
 */
export async function fetchAndExtractS3Content(s3UrlOrPath: string): Promise<string> {
  try {
    console.log("[S3 Fetcher] Processing content:", s3UrlOrPath);

    const response = await fetch("/api/files/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: s3UrlOrPath,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Extraction failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[S3 Fetcher] Successfully extracted ${result.contentLength} characters from ${result.fileType} file`);
    
    return result.content;
  } catch (error) {
    console.error("[S3 Fetcher] Error:", error);
    throw error;
  }
}

/**
 * Checks if content is likely an S3 URL/path that needs to be fetched
 */
export function isFetchableContent(content: string): boolean {
  if (!content) return false;

  // Recognize Cloudinary URLs
  if (content.includes("res.cloudinary.com")) return true;
  
  // Recognize Cloudinary Public IDs (usually starts with your folder name)
  if (content.startsWith("contracts/")) return true;

  // Legacy S3 support (optional, keep if you still have old records)
  if (content.includes(".s3.") || content.includes("amazonaws.com")) return true;
  
  // Standard filename regex
  if (/^[\w\-. ]+\.(pdf|docx?|txt)$/i.test(content.trim())) return true;
  
  return false;
}