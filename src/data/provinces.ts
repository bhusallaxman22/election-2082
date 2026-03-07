export interface ProvinceData {
  id: number;
  name: string;
  nameNp: string;
  color: string;
  totalSeats: number;
  districts: DistrictData[];
  partyResults: ProvincePartyResult[];
}

export interface DistrictData {
  slug: string;
  name: string;
  constituencies: number;
  districtId: number;
}

export interface ProvincePartyResult {
  partyShortName: string;
  partyColor: string;
  leads: number;
  wins: number;
}

export const provinces: ProvinceData[] = [
  {
    id: 1,
    name: "Koshi",
    nameNp: "कोशी",
    color: "#e5b6ac",
    totalSeats: 28,
    partyResults: [],
    districts: [
      { slug: "taplejung", name: "Taplejung", constituencies: 1, districtId: 1 },
      { slug: "panchthar", name: "Panchthar", constituencies: 1, districtId: 2 },
      { slug: "ilam", name: "Ilam", constituencies: 2, districtId: 3 },
      { slug: "jhapa", name: "Jhapa", constituencies: 5, districtId: 4 },
      { slug: "morang", name: "Morang", constituencies: 6, districtId: 9 },
      { slug: "sunsari", name: "Sunsari", constituencies: 4, districtId: 10 },
      { slug: "dhankuta", name: "Dhankuta", constituencies: 1, districtId: 8 },
      { slug: "terhathum", name: "Terhathum", constituencies: 1, districtId: 6 },
      { slug: "sankhuwasabha", name: "Sankhuwasabha", constituencies: 1, districtId: 5 },
      { slug: "bhojpur", name: "Bhojpur", constituencies: 1, districtId: 7 },
      { slug: "solukhumbu", name: "Solukhumbu", constituencies: 1, districtId: 11 },
      { slug: "okhaldhunga", name: "Okhaldhunga", constituencies: 1, districtId: 13 },
      { slug: "khotang", name: "Khotang", constituencies: 1, districtId: 12 },
      { slug: "udayapur", name: "Udayapur", constituencies: 2, districtId: 14 },
    ],
  },
  {
    id: 2,
    name: "Madhesh",
    nameNp: "मधेश",
    color: "#95cbdd",
    totalSeats: 32,
    partyResults: [],
    districts: [
      { slug: "saptari", name: "Saptari", constituencies: 4, districtId: 15 },
      { slug: "siraha", name: "Siraha", constituencies: 4, districtId: 16 },
      { slug: "dhanusha", name: "Dhanusha", constituencies: 4, districtId: 20 },
      { slug: "mahottari", name: "Mahottari", constituencies: 4, districtId: 21 },
      { slug: "sarlahi", name: "Sarlahi", constituencies: 4, districtId: 22 },
      { slug: "rautahat", name: "Rautahat", constituencies: 4, districtId: 32 },
      { slug: "bara", name: "Bara", constituencies: 4, districtId: 33 },
      { slug: "parsa", name: "Parsa", constituencies: 4, districtId: 34 },
    ],
  },
  {
    id: 3,
    name: "Bagmati",
    nameNp: "बागमती",
    color: "#b2d8a6",
    totalSeats: 33,
    partyResults: [],
    districts: [
      { slug: "dolakha", name: "Dolakha", constituencies: 1, districtId: 17 },
      { slug: "sindhupalchok", name: "Sindhupalchok", constituencies: 2, districtId: 30 },
      { slug: "rasuwa", name: "Rasuwa", constituencies: 1, districtId: 23 },
      { slug: "dhading", name: "Dhading", constituencies: 2, districtId: 24 },
      { slug: "nuwakot", name: "Nuwakot", constituencies: 2, districtId: 25 },
      { slug: "kathmandu", name: "Kathmandu", constituencies: 10, districtId: 26 },
      { slug: "bhaktapur", name: "Bhaktapur", constituencies: 2, districtId: 27 },
      { slug: "lalitpur", name: "Lalitpur", constituencies: 3, districtId: 28 },
      { slug: "kavrepalanchok", name: "Kavrepalanchok", constituencies: 2, districtId: 29 },
      { slug: "ramechhap", name: "Ramechhap", constituencies: 1, districtId: 18 },
      { slug: "sindhuli", name: "Sindhuli", constituencies: 2, districtId: 19 },
      { slug: "makwanpur", name: "Makwanpur", constituencies: 2, districtId: 31 },
      { slug: "chitwan", name: "Chitwan", constituencies: 3, districtId: 35 },
    ],
  },
  {
    id: 4,
    name: "Gandaki",
    nameNp: "गण्डकी",
    color: "#f2a55a",
    totalSeats: 18,
    partyResults: [],
    districts: [
      { slug: "gorkha", name: "Gorkha", constituencies: 2, districtId: 36 },
      { slug: "lamjung", name: "Lamjung", constituencies: 1, districtId: 38 },
      { slug: "tanahun", name: "Tanahun", constituencies: 2, districtId: 40 },
      { slug: "syangja", name: "Syangja", constituencies: 2, districtId: 41 },
      { slug: "kaski", name: "Kaski", constituencies: 3, districtId: 39 },
      { slug: "manang", name: "Manang", constituencies: 1, districtId: 37 },
      { slug: "mustang", name: "Mustang", constituencies: 1, districtId: 48 },
      { slug: "myagdi", name: "Myagdi", constituencies: 1, districtId: 49 },
      { slug: "parbat", name: "Parbat", constituencies: 1, districtId: 51 },
      { slug: "baglung", name: "Baglung", constituencies: 2, districtId: 50 },
      { slug: "nawalparasieast", name: "Nawalparasi (East)", constituencies: 2, districtId: 45 },
    ],
  },
  {
    id: 5,
    name: "Lumbini",
    nameNp: "लुम्बिनी",
    color: "#f4c2f1",
    totalSeats: 26,
    partyResults: [],
    districts: [
      { slug: "nawalparasiwest", name: "Nawalparasi (West)", constituencies: 2, districtId: 77 },
      { slug: "rupandehi", name: "Rupandehi", constituencies: 5, districtId: 46 },
      { slug: "kapilvastu", name: "Kapilvastu", constituencies: 3, districtId: 47 },
      { slug: "palpa", name: "Palpa", constituencies: 2, districtId: 43 },
      { slug: "arghakhanchi", name: "Arghakhanchi", constituencies: 1, districtId: 44 },
      { slug: "gulmi", name: "Gulmi", constituencies: 2, districtId: 42 },
      { slug: "pyuthan", name: "Pyuthan", constituencies: 1, districtId: 54 },
      { slug: "rolpa", name: "Rolpa", constituencies: 1, districtId: 53 },
      { slug: "rukumeast", name: "Rukum (East)", constituencies: 1, districtId: 52 },
      { slug: "dang", name: "Dang", constituencies: 3, districtId: 56 },
      { slug: "banke", name: "Banke", constituencies: 3, districtId: 65 },
      { slug: "bardiya", name: "Bardiya", constituencies: 2, districtId: 66 },
    ],
  },
  {
    id: 6,
    name: "Karnali",
    nameNp: "कर्णाली",
    color: "#ffe380",
    totalSeats: 12,
    partyResults: [],
    districts: [
      { slug: "dolpa", name: "Dolpa", constituencies: 1, districtId: 57 },
      { slug: "mugu", name: "Mugu", constituencies: 1, districtId: 58 },
      { slug: "humla", name: "Humla", constituencies: 1, districtId: 61 },
      { slug: "jumla", name: "Jumla", constituencies: 1, districtId: 59 },
      { slug: "kalikot", name: "Kalikot", constituencies: 1, districtId: 60 },
      { slug: "dailekh", name: "Dailekh", constituencies: 2, districtId: 63 },
      { slug: "surkhet", name: "Surkhet", constituencies: 2, districtId: 64 },
      { slug: "jajarkot", name: "Jajarkot", constituencies: 1, districtId: 62 },
      { slug: "rukumwest", name: "Rukum (West)", constituencies: 1, districtId: 78 },
      { slug: "salyan", name: "Salyan", constituencies: 1, districtId: 55 },
    ],
  },
  {
    id: 7,
    name: "Sudurpaschim",
    nameNp: "सुदूरपश्चिम",
    color: "#bcc0e7",
    totalSeats: 16,
    partyResults: [],
    districts: [
      { slug: "bajura", name: "Bajura", constituencies: 1, districtId: 67 },
      { slug: "bajhang", name: "Bajhang", constituencies: 1, districtId: 69 },
      { slug: "darchula", name: "Darchula", constituencies: 1, districtId: 72 },
      { slug: "baitadi", name: "Baitadi", constituencies: 1, districtId: 73 },
      { slug: "dadeldhura", name: "Dadeldhura", constituencies: 1, districtId: 74 },
      { slug: "doti", name: "Doti", constituencies: 1, districtId: 70 },
      { slug: "achham", name: "Achham", constituencies: 2, districtId: 68 },
      { slug: "kailali", name: "Kailali", constituencies: 5, districtId: 71 },
      { slug: "kanchanpur", name: "Kanchanpur", constituencies: 3, districtId: 75 },
    ],
  },
];

export interface ProportionalResult {
  party: string;
  votes: number;
  year: number;
}

export const proportionalResults2079: ProportionalResult[] = [
  { party: "CPN-UML", votes: 2791734, year: 2079 },
  { party: "Nepali Congress", votes: 2666262, year: 2079 },
  { party: "CPN (Maoist Center)", votes: 1162931, year: 2079 },
  { party: "Rastriya Swatantra Party", votes: 1124557, year: 2079 },
  { party: "RPP", votes: 586659, year: 2079 },
  { party: "Janata Samajbadi", votes: 420946, year: 2079 },
  { party: "Janamat Party", votes: 394523, year: 2079 },
  { party: "CPN (Unified Socialist)", votes: 294411, year: 2079 },
  { party: "Nagarik Unmukti", votes: 271663, year: 2079 },
  { party: "Loktantrik Samajwadi", votes: 167282, year: 2079 },
];

export const proportionalResults2074: ProportionalResult[] = [
  { party: "CPN-UML", votes: 3173494, year: 2074 },
  { party: "Nepali Congress", votes: 3128389, year: 2074 },
  { party: "Maoist Centre", votes: 1303721, year: 2074 },
  { party: "SSF", votes: 472254, year: 2074 },
  { party: "RJP", votes: 470201, year: 2074 },
  { party: "Other", votes: 996685, year: 2074 },
];
