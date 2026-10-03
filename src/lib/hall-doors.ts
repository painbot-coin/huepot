/** Four ways into the house. Classic stays one of them. */

export type HallDoor = {
  id: string;
  title: string;
  line: string;
  href: string;
};

export function hallDoors(): HallDoor[] {
  return [
    {
      id: "color",
      title: "Sit a color",
      line: "Classic holds the pot.",
      href: "/rooms/classic",
    },
    {
      id: "book",
      title: "Sit a book",
      line: "Watch a sit, then take the file.",
      href: "/wait",
    },
    {
      id: "seat",
      title: "Meet a seat",
      line: "A person, a craft, or just here.",
      href: "/network",
    },
    {
      id: "house",
      title: "Read the house",
      line: "The house posts about doors that exist.",
      href: "/how-it-works",
    },
  ];
}
