import Image from "next/image";
import type { Attachment } from "@/lib/types";
import { Loader } from "./elements/loader";
import { CrossSmallIcon } from "./icons";
import { Button } from "./ui/button";

// Icons for different file types
const getFileIcon = (contentType: string, name?: string) => {
  const extension = name?.split(".").pop()?.toLowerCase() || "";

  // PDF icon
  if (contentType === "application/pdf" || extension === "pdf") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M14 2v6h6M10 13.5v-1.5a1 1 0 1 1 2 0v1.5a1 1 0 1 1-2 0zM8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Word document icon
  if (
    contentType === "application/msword" ||
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "doc" ||
    extension === "docx"
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-600">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Excel/spreadsheet icon
  if (
    contentType === "application/vnd.ms-excel" ||
    contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    contentType === "text/csv" ||
    extension === "xls" ||
    extension === "xlsx" ||
    extension === "csv"
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-600">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M14 2v6h6M8 13h2v2H8zM12 13h2v2h-2zM8 17h2v2H8zM12 17h2v2h-2z" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  // Text file icon
  if (contentType === "text/plain" || extension === "txt") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M14 2v6h6M8 12h8M8 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Default file icon
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
};

const getFileLabel = (contentType: string, name?: string) => {
  const extension = name?.split(".").pop()?.toLowerCase() || "";

  if (contentType === "application/pdf" || extension === "pdf") return "PDF";
  if (contentType?.includes("word") || extension === "doc" || extension === "docx") return "DOC";
  if (contentType?.includes("excel") || contentType?.includes("spreadsheet") || extension === "xls" || extension === "xlsx") return "XLS";
  if (contentType === "text/csv" || extension === "csv") return "CSV";
  if (contentType === "text/plain" || extension === "txt") return "TXT";

  return "FILE";
};

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const isImage = contentType?.startsWith("image");

  return (
    <div
      className="group relative size-16 overflow-hidden rounded-lg border bg-muted"
      data-testid="input-attachment-preview"
    >
      {isImage ? (
        <Image
          alt={name ?? "An image attachment"}
          className="size-full object-cover"
          height={64}
          src={url}
          width={64}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-0.5 p-1">
          {getFileIcon(contentType || "", name)}
          <span className="text-[8px] font-medium text-muted-foreground">
            {getFileLabel(contentType || "", name)}
          </span>
        </div>
      )}

      {isUploading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50"
          data-testid="input-attachment-loader"
        >
          <Loader size={16} />
        </div>
      )}

      {onRemove && !isUploading && (
        <Button
          className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          size="sm"
          variant="destructive"
        >
          <CrossSmallIcon size={8} />
        </Button>
      )}

      <div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
        {name}
      </div>
    </div>
  );
};

