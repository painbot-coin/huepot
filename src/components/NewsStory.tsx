"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import HouseLink from "@/components/HouseLink";
import { HouseButton } from "@/components/HouseUi";
import { newsHref, talkHref } from "@/lib/news-href";
import type { NewsRow } from "@/components/NewsDesk";

function ago(at: number) {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NewsStory({
  item,
  related,
}: {
  item: NewsRow;
  related: NewsRow[];
}) {
  const talk = item.talkId ? talkHref(item.talkId) : "";
  const sourceHref = `/news?tag=${encodeURIComponent(item.tag || "all")}&source=${encodeURIComponent(item.source)}`;

  return (
    <article className="news-story">
      <Typography color="text.secondary" variant="overline">
        News
      </Typography>
      <Typography color="text.secondary" variant="caption">
        <HouseLink href={sourceHref}>{item.source}</HouseLink>
        {" · "}
        {ago(item.publishedAt)}
      </Typography>
      <Typography component="h1" variant="h3">
        {item.title}
      </Typography>
      {item.image ? (
        <Card className="news-story-shot-card">
          <CardMedia
            alt=""
            className="news-story-shot"
            component="img"
            image={item.image}
            referrerPolicy="no-referrer"
          />
        </Card>
      ) : null}
      <Typography color="text.secondary" variant="body1">
        {item.summary || `${item.source} posted this headline. Talk about it on the network.`}
      </Typography>
      <div className="news-pager">
        {talk ? <HouseButton href={talk}>Talk</HouseButton> : null}
        <HouseButton ghost href="/news">
          All news
        </HouseButton>
        <HouseButton ghost href="/rooms/classic">
          Play Classic
        </HouseButton>
      </div>
      {related.length ? (
        <div className="news-related">
          <Typography color="text.secondary" variant="overline">
            More headlines
          </Typography>
          <div className="news-list">
            {related.map((row) => {
              const href = newsHref(row.id);
              if (!href) return null;
              return (
                <Card className="news-card is-compact" key={row.id}>
                  <HouseLink className="news-card-link" href={href}>
                    <CardContent
                      className="news-card-body"
                      sx={{ display: "flex", flexDirection: "column", gap: 1, px: 2.25, py: 2, "&:last-child": { pb: 2 } }}
                    >
                      <Typography component="h2" variant="subtitle1">
                        {row.title}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {row.source}
                      </Typography>
                    </CardContent>
                  </HouseLink>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
