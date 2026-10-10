// All imagery is referenced from this one file so the team can swap in licensed
// Rwanda photography (e.g. from the RDB / Visit Rwanda media library) without
// touching components. If any URL fails, <SmartImage> shows a branded fallback.
const u = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

const file = (name: string, w = 1800) => `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=${w}`;

/** Landmark photos for the home hero. Each URL was checked to return an image. */
export const heroSlides = [
  { src: file('KIGALI_NIGHT.jpg'), alt: 'Kigali at night, with the Convention Centre dome lit above the city', place: 'Kigali Convention Centre at night', position: '68% 16%' },
  { src: file('Amahoro_Stadium.jpg'), alt: 'Amahoro Stadium lit green and blue at night', place: 'Amahoro Stadium at night', position: '88% 10%' },
  { src: file('Bk_arena.jpg'), alt: 'The glass front of BK Arena in Kigali', place: 'BK Arena', position: 'center' },
  { src: file('Volcanoes_National_Park_Rwanda.jpg'), alt: 'Volcanoes rising over green farmland in Volcanoes National Park', place: 'Volcanoes National Park', position: 'center' },
  { src: file('Nyungwe_Canopy_Walk.jpg'), alt: 'A canopy walkway through the forest of Nyungwe National Park', place: 'Nyungwe National Park', position: 'center' },
];

export const images = {
  hero: u('photo-1470071459604-3b5ec3a7fe05', 2000),
  kigali: u('photo-1611348586804-61bf6c080437'),
  volcanoes: u('photo-1506905925346-21bda4d32df4'),
  gorilla: u('photo-1557050543-4d5f4e07ef46'),
  nyungwe: u('photo-1441974231531-c6227db76b6e'),
  forestPath: u('photo-1447752875215-b2761acb3c5d'),
  akagera: u('photo-1516426122078-c23e76319801'),
  savanna: u('photo-1489392191049-fc10c97e64b6'),
  zebra: u('photo-1547471080-7cc2caa01a7e'),
  lake: u('photo-1501785888041-af3ef285b470'),
  lakeCalm: u('photo-1439066615861-d1af74d74000'),
  hills: u('photo-1470071459604-3b5ec3a7fe05'),
  coffee: u('photo-1497935586351-b67a49e012bf'),
  coffeeCup: u('photo-1495474472287-4d71bcdd2085'),
  food: u('photo-1504674900247-0877df9cc836'),
  lodge: u('photo-1520250497591-112f2f40a3f4'),
  hotel: u('photo-1566073771259-6a8506099945'),
  people: u('photo-1529156069898-49953e39b3ac'),
  crafts: u('photo-1528396518501-b53b655eb9b3'),
  village: u('photo-1523805009345-7448845a9e53'),
  hotelExterior: u('photo-1542314831-068cd1dbfeeb'),
  hotelPool: u('photo-1551882547-ff40c63fe5fa'),
  hotelRoom: u('photo-1611892440504-42a792e24d32'),
  hotelSuite: u('photo-1582719478250-c89cae4dc85b'),
  house: u('photo-1564013799919-ab600027ffc6'),
  villa: u('photo-1600596542815-ffad4c1539a9'),
  apartment: u('photo-1522708323590-d24dbb6b0267'),
  cabin: u('photo-1449158743715-0a90ebb6d2d8'),
};
