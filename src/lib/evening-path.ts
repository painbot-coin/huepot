/**
 * A first visit with no gold and no click.
 * Hall, a book, the store, a seat, and back.
 * Classic is offered. It is not a step.
 */

import { deskHref, markById, sitParam } from "@/lib/house-mark-list";
import { DEFAULT_LOCALE, type LocaleId } from "@/lib/locale";

export const EVENING_BOOK_KEY = "huepot-book";

export type EveningStepId = "hall" | "book" | "store" | "seat";

export type EveningStep = {
  id: EveningStepId;
  title: string;
  line: string;
  href: string;
};

type EveningCopy = {
  kicker: string;
  hall: string;
  hallLine: string;
  book: string;
  bookLine: string;
  store: string;
  storeLine: string;
  seat: string;
  seatLine: string;
  classic: string;
};

const COPY: Record<LocaleId, EveningCopy> = {
  en: {
    kicker: "An evening",
    hall: "The hall",
    hallLine: "Four doors.",
    book: "A book",
    bookLine: "Watch a sit.",
    store: "The store",
    storeLine: "The file.",
    seat: "A seat",
    seatLine: "A person, or just here.",
    classic: "Classic is open.",
  },
  es: {
    kicker: "Una velada",
    hall: "El vestíbulo",
    hallLine: "Cuatro puertas.",
    book: "Un libro",
    bookLine: "Mira una sentada.",
    store: "La tienda",
    storeLine: "El archivo.",
    seat: "Un asiento",
    seatLine: "Una persona, o solo aquí.",
    classic: "Classic está abierto.",
  },
  zh: {
    kicker: "一个晚上",
    hall: "门厅",
    hallLine: "四扇门。",
    book: "一本书",
    bookLine: "看一场坐。",
    store: "商店",
    storeLine: "那个文件。",
    seat: "一个座位",
    seatLine: "一个人，或只是在这里。",
    classic: "Classic 开着。",
  },
  hi: {
    kicker: "एक शाम",
    hall: "हाल",
    hallLine: "चार दरवाज़े।",
    book: "एक किताब",
    bookLine: "एक बैठक देखो।",
    store: "स्टोर",
    storeLine: "वह फ़ाइल।",
    seat: "एक सीट",
    seatLine: "एक व्यक्ति, या बस यहाँ।",
    classic: "Classic खुला है।",
  },
  ar: {
    kicker: "أمسية",
    hall: "القاعة",
    hallLine: "أربعة أبواب.",
    book: "كتاب",
    bookLine: "شاهد جلسة.",
    store: "المتجر",
    storeLine: "الملف.",
    seat: "مقعد",
    seatLine: "شخص، أو فقط هنا.",
    classic: "Classic مفتوح.",
  },
  pt: {
    kicker: "Uma noite",
    hall: "O hall",
    hallLine: "Quatro portas.",
    book: "Um livro",
    bookLine: "Vê uma sentada.",
    store: "A loja",
    storeLine: "O arquivo.",
    seat: "Um lugar",
    seatLine: "Uma pessoa, ou só aqui.",
    classic: "Classic está aberto.",
  },
  ru: {
    kicker: "Вечер",
    hall: "Зал",
    hallLine: "Четыре двери.",
    book: "Книга",
    bookLine: "Смотри посадку.",
    store: "Магазин",
    storeLine: "Файл.",
    seat: "Место",
    seatLine: "Человек, или просто здесь.",
    classic: "Classic открыт.",
  },
  ja: {
    kicker: "夕べ",
    hall: "ホール",
    hallLine: "四つの戸。",
    book: "本",
    bookLine: "一席を見る。",
    store: "店",
    storeLine: "そのファイル。",
    seat: "席",
    seatLine: "人、またはただここ。",
    classic: "Classic は開いている。",
  },
  fr: {
    kicker: "Une soirée",
    hall: "Le hall",
    hallLine: "Quatre portes.",
    book: "Un livre",
    bookLine: "Regarder une séance.",
    store: "La boutique",
    storeLine: "Le fichier.",
    seat: "Un siège",
    seatLine: "Une personne, ou juste ici.",
    classic: "Classic est ouvert.",
  },
  de: {
    kicker: "Ein Abend",
    hall: "Die Halle",
    hallLine: "Vier Türen.",
    book: "Ein Buch",
    bookLine: "Eine Sitzung ansehen.",
    store: "Der Laden",
    storeLine: "Die Datei.",
    seat: "Ein Sitz",
    seatLine: "Eine Person, oder einfach hier.",
    classic: "Classic ist offen.",
  },
  ko: {
    kicker: "저녁",
    hall: "홀",
    hallLine: "문 네 개.",
    book: "한 권",
    bookLine: "한 자리를 보다.",
    store: "가게",
    storeLine: "그 파일.",
    seat: "자리",
    seatLine: "한 사람, 또는 그냥 여기.",
    classic: "Classic은 열려 있다.",
  },
  id: {
    kicker: "Satu malam",
    hall: "Aula",
    hallLine: "Empat pintu.",
    book: "Satu buku",
    bookLine: "Lihat satu duduk.",
    store: "Toko",
    storeLine: "Berkas itu.",
    seat: "Satu tempat",
    seatLine: "Seseorang, atau hanya di sini.",
    classic: "Classic terbuka.",
  },
};

export function eveningCopy(locale: LocaleId) {
  return COPY[locale] ?? COPY[DEFAULT_LOCALE];
}

export function eveningBookId(raw: string | null | undefined) {
  return sitParam(raw ?? "");
}

export function eveningBookHref(id: string) {
  return deskHref(eveningBookId(id));
}

export function eveningBookName(id: string) {
  return markById(eveningBookId(id))?.name ?? "";
}

export function eveningSteps(bookId: string, locale: LocaleId = DEFAULT_LOCALE): EveningStep[] {
  const copy = eveningCopy(locale);
  const id = eveningBookId(bookId);
  const name = eveningBookName(id);
  return [
    { id: "hall", title: copy.hall, line: copy.hallLine, href: "/" },
    { id: "book", title: copy.book, line: name || copy.bookLine, href: eveningBookHref(id) },
    { id: "store", title: copy.store, line: copy.storeLine, href: "/wait/store" },
    { id: "seat", title: copy.seat, line: copy.seatLine, href: "/network" },
  ];
}

export function eveningHere(pathname: string): EveningStepId | "" {
  if (pathname === "/") return "hall";
  if (pathname === "/wait/store" || pathname.startsWith("/wait/store/")) return "store";
  if (pathname === "/wait") return "book";
  if (pathname === "/network" || pathname.startsWith("/network/")) return "seat";
  return "";
}
