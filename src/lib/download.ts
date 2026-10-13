/** Laat de browser een bestand downloaden met de opgegeven naam (betrouwbaarder dan een data:-link). */
export function downloadFile(name: string, content: string | Blob) {
  const blob = typeof content === "string" ? dataUrlToBlob(content) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, data = ""] = dataUrl.split(",");
  const mime = head?.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

/** Maakt een veilige bestandsnaam van een projectnaam. */
export function safeFileName(name: string, fallback = "ontwerp") {
  return name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || fallback;
}
