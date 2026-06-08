// Colour coding (from the handwritten list). Each task can be tagged with one of
// these. `hex` is the swatch shown in the app; `googleColorId` is Google
// Calendar's matching event colour (1–11) for the future one-tap auto-push.
//
// Google's event colours: 1 Lavender · 2 Sage · 3 Grape · 4 Flamingo · 5 Banana ·
// 6 Tangerine · 7 Peacock · 8 Graphite · 9 Blueberry · 10 Basil · 11 Tomato.
// Each `hex` is Google Calendar's EXACT colour for that `googleColorId`, so the
// in-app swatch matches what shows up in the calendar. Every label uses a
// distinct Google colour (Google has only 11 fixed event colours, so each option
// maps to the nearest one).
//   1 Lavender #7986CB · 2 Sage #33B679 · 3 Grape #8E24AA · 4 Flamingo #E67C73 ·
//   5 Banana #F6BF26 · 6 Tangerine #F4511E · 7 Peacock #039BE5 · 8 Graphite
//   #616161 · 9 Blueberry #3F51B5 · 10 Basil #0B8043 · 11 Tomato #D50000
export const COLOR_CODES = [
  { key: "top3", label: "Top 3", hex: "#8E24AA", googleColorId: "3" },
  { key: "fixed", label: "Fixed", hex: "#D50000", googleColorId: "11" },
  { key: "flexible", label: "Flexible", hex: "#0B8043", googleColorId: "10" },
  { key: "nonDelegatable", label: "Non Delegatable", hex: "#F6BF26", googleColorId: "5" },
  { key: "family", label: "Family", hex: "#039BE5", googleColorId: "7" },
  { key: "alonePersonal", label: "Alone Time / Personal", hex: "#3F51B5", googleColorId: "9" },
  { key: "meFreeTime", label: "Me Time / Free Time", hex: "#616161", googleColorId: "8" },
  { key: "staffTime", label: "Staff Time", hex: "#33B679", googleColorId: "2" },
  { key: "marketing", label: "Marketing", hex: "#E67C73", googleColorId: "4" },
  { key: "collection", label: "Collection", hex: "#7986CB", googleColorId: "1" },
  { key: "paidWork", label: "Paid Work", hex: "#F4511E", googleColorId: "6" },
];

const BY_KEY = COLOR_CODES.reduce((m, c) => {
  m[c.key] = c;
  return m;
}, {});

export const colorByKey = (key) => BY_KEY[key] || null;
