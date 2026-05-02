import { Router } from "express";
// @ts-ignore — no types for ytsr
import ytsr from "ytsr";

const router = Router();

router.get("/search", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query) {
    res.status(400).json({ error: "Missing query parameter q" });
    return;
  }

  try {
    const exclude = String(req.query.exclude ?? "").trim();
    const results = await ytsr(query, { limit: 10 });
    const video = results.items.find(
      (item: any) => item.type === "video" && item.id && item.title && item.id !== exclude
    );

    if (!video) {
      res.status(404).json({ error: "No video found for query" });
      return;
    }

    res.json({
      id: video.id,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      embedUrl: `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&enablejsapi=1`,
      thumbnail: video.bestThumbnail?.url ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? "Search failed") });
  }
});

export default router;
