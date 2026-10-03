"use client";

import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import HouseLink from "@/components/HouseLink";
import { HouseButton, HouseChip, PageHead } from "@/components/HouseUi";
import { newsDeskChips, newsHref, talkHref } from "@/lib/news-href";

export type NewsRow = {
  id: string;
  title: string;
  summary: string;
  source: string;
  image: string;
  publishedAt: number;
  tag?: string;
  talkId?: string;
};

export type NewsOutletRow = { source: string; count: number };

function ago(at: number) {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function listHref(params: { tag?: string; source?: string; before?: number }) {
  const search = new URLSearchParams();
  search.set("tag", params.tag || "all");
  if (params.source) search.set("source", params.source);
  if (params.before) search.set("before", String(params.before));
  return `/news?${search.toString()}`;
}

export function NewsCard({
  item,
  compact,
}: {
  item: NewsRow;
  compact?: boolean;
}) {
  const href = newsHref(item.id);
  const talk = item.talkId ? talkHref(item.talkId) : "";
  if (!href) return null;
  return (
    <Card className={compact ? "news-card is-compact" : "news-card"}>
      <HouseLink className="news-card-link" href={href}>
        <div className={item.image ? "news-card-row has-shot" : "news-card-row"}>
          {item.image ? (
            <CardMedia
              alt=""
              className="news-card-shot"
              component="img"
              image={item.image}
              referrerPolicy="no-referrer"
            />
          ) : null}
          <CardContent
            className="news-card-body"
            sx={{ display: "flex", flexDirection: "column", gap: 2, px: 2.5, py: 2.25, "&:last-child": { pb: 2.25 } }}
          >
            <Typography component="h2" sx={{ fontWeight: 700 }} variant={compact ? "subtitle1" : "h5"}>
              {item.title}
            </Typography>
            {item.summary && !compact ? (
              <Typography color="text.secondary" variant="body2">
                {item.summary}
              </Typography>
            ) : null}
            <Typography color="text.secondary" variant="caption">
              {item.source} · {ago(item.publishedAt)}
            </Typography>
          </CardContent>
        </div>
      </HouseLink>
      {talk ? (
        <CardActions sx={{ px: 2.5, pb: 2, pt: 0.25 }}>
          <HouseButton ghost href={talk} size="small">
            Talk
          </HouseButton>
        </CardActions>
      ) : null}
    </Card>
  );
}

export function NewsDesk({
  tag,
  source,
  before,
  total,
  hasOlder,
  oldest,
  outlets,
  items,
}: {
  tag: string;
  source: string;
  before: boolean;
  total: number;
  hasOlder: boolean;
  oldest?: number;
  outlets: NewsOutletRow[];
  items: NewsRow[];
}) {
  const filtered = Boolean(tag || source);
  const count =
    total === 0
      ? "Nothing on the wire under that filter."
      : `${total.toLocaleString()} headline${total === 1 ? "" : "s"}${
          !tag && !source
            ? " about betting games"
            : tag === "sport" && !source
              ? " on sports betting"
              : tag === "casino" && !source
                ? " on casino games"
                : " match"
        }${before ? ", showing older ones" : ""}.`;

  const desks = newsDeskChips(outlets, (row) => row.source === source);

  return (
    <div className="news-desk">
      <PageHead
        lead="Odds, lines, and new tables — newest first. Each story opens here. Talk lives on the network."
        title="Betting news"
      />

      <div className="news-filters">
        <HouseChip href={listHref({ tag: "all", source })} label="All games" on={!tag} />
        <HouseChip href={listHref({ tag: "sport", source })} label="Sports" on={tag === "sport"} />
        <HouseChip href={listHref({ tag: "casino", source })} label="Casino" on={tag === "casino"} />
      </div>

      {desks.length ? (
        <div className="news-filters">
          {desks.map((outlet) => (
            <HouseChip
              href={
                source === outlet.source
                  ? listHref({ tag })
                  : listHref({ tag, source: outlet.source })
              }
              key={outlet.source}
              label={`${outlet.source} · ${outlet.count}`}
              on={source === outlet.source}
            />
          ))}
        </div>
      ) : null}

      <Typography color="text.secondary" variant="body2">
        {count}
        {filtered ? (
          <>
            {" "}
            <HouseLink href={listHref({ tag: "all" })}>Show everything</HouseLink>
          </>
        ) : null}
      </Typography>

      {items.length ? (
        <div className="news-list">
          {items.map((item) => (
            <NewsCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <Typography color="text.secondary" variant="body2">
          {filtered
            ? "No headlines from that outlet yet."
            : "The wire is quiet. Headlines land within a quarter of an hour of the house starting up."}
        </Typography>
      )}

      <div className="news-pager">
        {before ? (
          <HouseButton ghost href={listHref({ tag, source })}>
            Back to newest
          </HouseButton>
        ) : null}
        {hasOlder && oldest ? (
          <HouseButton ghost href={listHref({ tag, source, before: oldest })}>
            Older headlines
          </HouseButton>
        ) : null}
      </div>

      <HouseButton href="/rooms/classic">Play Classic</HouseButton>
    </div>
  );
}
