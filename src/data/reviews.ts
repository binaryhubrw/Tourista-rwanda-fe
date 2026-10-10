import type { Review } from '@/types';

const baseReviews: Review[] = [
  { id: 'r1', targetId: 'volcanoes-national-park', targetType: 'location', targetName: 'Volcanoes National Park', userId: 'u-amani', userName: 'Amani K.', rating: 5, comment: 'We spent an hour with the Sabyinyo family. Our tracker Fidèle knew every gorilla by name. Worth every franc of the permit.', date: '2026-08-14' },
  { id: 'r2', targetId: 'volcanoes-national-park', targetType: 'location', targetName: 'Volcanoes National Park', userId: 'u-sarah', userName: 'Sarah M.', rating: 5, comment: 'Bisoke is a steep, muddy climb but the crater lake at the top is unreal. Hire a porter: it helps you and their family.', date: '2026-07-22' },
  { id: 'r3', targetId: 'kigali', targetType: 'location', targetName: 'Kigali', userId: 'u-diane', userName: 'Diane U.', rating: 5, comment: 'As a Rwandan living abroad, I was proud showing my kids the art scene in Kimihurura and the market in Kimironko.', date: '2026-09-02' },
  { id: 'r4', targetId: 'kigali', targetType: 'location', targetName: 'Kigali', userId: 'u-tom', userName: 'Tom B.', rating: 4, comment: 'Safest, cleanest capital I have visited. Plan around Umuganda on the last Saturday, shops open late that morning.', date: '2026-06-18' },
  { id: 'r5', targetId: 'nyungwe-national-park', targetType: 'location', targetName: 'Nyungwe National Park', userId: 'u-ines', userName: 'Inès R.', rating: 5, comment: 'The canopy walkway in morning mist is magical. Saw a troop of over 100 colobus monkeys on the Igishigishigi trail.', date: '2026-08-30' },
  { id: 'r6', targetId: 'akagera-national-park', targetType: 'location', targetName: 'Akagera National Park', userId: 'u-kevin', userName: 'Kevin N.', rating: 5, comment: 'Lions on our first morning drive and hippos everywhere on the boat trip. Easy day trip from Kigali if you leave at 5am.', date: '2026-07-05' },
  { id: 'r7', targetId: 'lake-kivu', targetType: 'location', targetName: 'Lake Kivu', userId: 'u-grace', userName: 'Grace I.', rating: 4, comment: "Napoleon's Island bats are something else. Bring a hat! Karongi is quieter than Rubavu and we loved it.", date: '2026-05-11' },
  { id: 'r8', targetId: 'twin-lakes-burera-ruhondo', targetType: 'location', targetName: 'Twin Lakes Burera & Ruhondo', userId: 'u-amani', userName: 'Amani K.', rating: 5, comment: 'Paddled with a fisherman at sunrise. Total silence apart from the birds. Nobody else there.', date: '2026-08-16' },
  { id: 'r9', targetId: 'nyamirambo-food-walk', targetType: 'experience', targetName: 'Nyamirambo food & culture walk', userId: 'u-lisa', userName: 'Lisa H.', rating: 5, comment: 'Our guide Mama Aisha cooked the best isombe we had all trip. Money goes straight to the women’s centre.', date: '2026-09-10' },
  { id: 'r10', targetId: 'agaseke-weavers', targetType: 'business', targetName: 'Agaseke Weavers Cooperative', userId: 'u-sarah', userName: 'Sarah M.', rating: 5, comment: 'Learned to start a basket base, which is much harder than it looks. Bought three to take home.', date: '2026-07-28' },
  { id: 'r11', targetId: 'virunga-hillside-ecolodge', targetType: 'business', targetName: 'Virunga Hillside Eco-Lodge', userId: 'u-tom', userName: 'Tom B.', rating: 5, comment: 'Fire lit in the cottage when we got back from the trek. Garden food was excellent.', date: '2026-08-15' },
  { id: 'r12', targetId: 'huye', targetType: 'location', targetName: 'Huye', userId: 'u-kevin', userName: 'Kevin N.', rating: 4, comment: 'The Ethnographic Museum is the best introduction to Rwandan culture. Ask about dance performances.', date: '2026-04-20' },
];

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

type Extra = [string, Review['targetType'], string, string, string, Review['rating'], string, number];

// Reviews written by the demo tourist, and more guest reviews for the demo business.
const extra: Extra[] = [
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'user-tourist-1', 'Amani Kayitesi', 5, 'Woke up to the volcanoes outside the window. Staff packed us a hot lunch for the trek without being asked.', 24],
  ['nyamirambo-food-walk', 'experience', 'Nyamirambo food & culture walk', 'user-tourist-1', 'Amani Kayitesi', 5, 'Best afternoon in Kigali. The brochettes and the stories about the neighbourhood were both wonderful.', 61],
  ['lake-kivu', 'location', 'Lake Kivu', 'user-tourist-1', 'Amani Kayitesi', 4, 'Calm, beautiful and great for swimming. Book the boat to the islands early in the morning.', 98],
  ['kinigi-guides', 'business', 'Kinigi Community Guides', 'user-tourist-1', 'Amani Kayitesi', 5, 'Our guide knew every farmer on the path to the twin lakes. Canoe crossing was the highlight.', 140],
  ['akagera-national-park', 'location', 'Akagera National Park', 'user-tourist-1', 'Amani Kayitesi', 4, 'Saw giraffes and elephants within the first hour. Roads get dusty, bring a scarf.', 205],
  ['intore-dance-evening', 'experience', 'Intore dance evening', 'user-tourist-1', 'Amani Kayitesi', 3, 'The dancing was amazing but the evening started an hour late. Still worth going.', 260],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-lisa', 'Lisa H.', 5, 'Solar showers were hot, the fire was lit, and the staff remembered our names on day two.', 9],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-kevin', 'Kevin N.', 4, 'Great base for the gorilla trek. Wi-Fi is slow but honestly that was a bonus.', 33],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-grace', 'Grace I.', 5, 'Proud to see a women-led lodge doing this well. Garden dinners are the best in Musanze.', 47],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-sarah', 'Sarah M.', 5, 'Cottage was spotless and the view of Sabyinyo at sunrise made us cry a little.', 75],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-ines', 'Inès R.', 4, 'Lovely stay. Would add more vegetarian options at breakfast.', 102],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-james', 'James O.', 5, 'Seamless pickup from the park HQ and a packed lunch that kept us going on Bisoke.', 131],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-mei', 'Mei T.', 3, 'Beautiful place but our cottage was cold at night. Ask for an extra blanket.', 166],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-carlos', 'Carlos M.', 5, 'The owner walked us through the village co-op. Real community tourism.', 199],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-aisha', 'Aisha B.', 4, 'Comfortable, quiet and great value for the area.', 238],
  ['virunga-hillside-ecolodge', 'business', 'Virunga Hillside Eco-Lodge', 'u-olivia', 'Olivia B.', 5, 'Everything we hoped for after the trek: warm fire, hot food, kind people.', 281],
  ['umurage-tours', 'business', 'Umurage Tours', 'u-patrick', 'Patrick H.', 5, 'Jean-Paul planned four days around our pace. Flawless.', 18],
  ['inzu-kitchen', 'business', 'Inzu Kitchen', 'u-noah', 'Noah S.', 4, 'The isombe and plantain were delicious. Portions are generous.', 39],
  ['agaseke-weavers', 'business', 'Agaseke Weavers Cooperative', 'u-fatou', 'Fatou D.', 5, 'Patient teachers and beautiful baskets. Went home with two.', 56],
  ['kivu-bike-collective', 'business', 'Kivu Bike Collective', 'u-emma', 'Emma L.', 2, 'Bike chain broke halfway. They came to fix it quickly but we lost an hour.', 12],
  ['coffee-farm-to-cup', 'experience', 'Coffee from farm to cup', 'u-diane', 'Diane U.', 5, 'Picked, washed, roasted and tasted. Never thought about coffee the same way again.', 88],
  ['nyungwe-national-park', 'location', 'Nyungwe National Park', 'u-tom', 'Tom B.', 5, 'Chimp tracking at dawn was hard work and completely worth it.', 121],
];

export const reviewsSeed: Review[] = [
  ...extra.map(([targetId, targetType, targetName, userId, userName, rating, comment, daysAgo], i) => ({
    id: `r-x${i + 1}`, targetId, targetType, targetName, userId, userName, rating, comment, date: iso(daysAgo),
  })),
  ...baseReviews,
];
