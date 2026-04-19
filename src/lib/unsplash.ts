type UnsplashSearchResult = {
  results: Array<{
    id: string;
    urls: { regular: string; full: string; raw: string };
    links: { html: string };
    user: { name: string; links: { html: string } };
    width: number;
    height: number;
  }>;
};

export async function searchUnsplashPhoto(
  accessKey: string,
  query: string,
): Promise<{
  downloadUrl: string;
  pageUrl: string;
  authorName: string;
  authorUrl: string;
}> {
  const params = new URLSearchParams({
    query,
    per_page: "5",
    orientation: "landscape",
    content_filter: "high",
  });
  const res = await fetch(
    `https://api.unsplash.com/search/photos?${params.toString()}`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 0 },
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Unsplash search failed: ${res.status} ${t}`);
  }
  const data = (await res.json()) as UnsplashSearchResult;
  const pick =
    data.results.find((p) => p.width >= 1200) ?? data.results.at(0) ?? null;
  if (!pick) {
    throw new Error("Unsplash returned no images for query");
  }
  const downloadUrl = `${pick.urls.raw}&w=1600&fit=max&q=80&fm=jpg`;
  return {
    downloadUrl,
    pageUrl: pick.links.html,
    authorName: pick.user.name,
    authorUrl: pick.user.links.html,
  };
}

export async function downloadImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Image download failed: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}
