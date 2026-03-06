export interface CandidateResult {
  id: string;
  name: string;
  partyShortName: string;
  partyColor: string;
  votes: number;
  status: "leading" | "trailing" | "pending";
  margin?: number;
  photo: string;
}

export interface ConstituencyResult {
  constituency: string;
  constituencySlug: string;
  province: string;
  candidates: CandidateResult[];
  totalVotes: number;
  countingStatus: string;
}

export const popularCandidates: ConstituencyResult[] = [
  {
    constituency: "Jhapa-5",
    constituencySlug: "jhapa-5",
    province: "Koshi",
    totalVotes: 1953,
    countingStatus: "Counting in progress",
    candidates: [
      { id: "c1", name: "Balendra Shah", partyShortName: "RSP", partyColor: "#E63946", votes: 1478, status: "leading", margin: 1093, photo: "https://assets-generalelection2082.ekantipur.com/candidates/e1f8a9c79c776cc8f747784aec9f43b8.jpg" },
      { id: "c2", name: "KP Sharma Oli", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 385, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/5e4bc046e2a1d5f43f579cc48158d31f.jpg" },
      { id: "c3", name: "Ranjit Tamang", partyShortName: "NCP", partyColor: "#FF5722", votes: 90, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/779f483fe46d8222c915bd798b931574.jpg" },
    ],
  },
  {
    constituency: "Rukum East-1",
    constituencySlug: "rukum-east-1",
    province: "Lumbini",
    totalVotes: 2263,
    countingStatus: "Counting in progress",
    candidates: [
      { id: "c4", name: "Pushpa Kamal Dahal", partyShortName: "NCP", partyColor: "#FF5722", votes: 1415, status: "leading", margin: 984, photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770873766.jpg" },
      { id: "c5", name: "Lilamani Gautam", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 431, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770873738.jpg" },
      { id: "c6", name: "Kusum Devi Thapa", partyShortName: "NC", partyColor: "#2196F3", votes: 417, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770873748.jpg" },
    ],
  },
  {
    constituency: "Bhaktapur-2",
    constituencySlug: "bhaktapur-2",
    province: "Bagmati",
    totalVotes: 2771,
    countingStatus: "Counting in progress",
    candidates: [
      { id: "c7", name: "Rajiv Khatri", partyShortName: "RSP", partyColor: "#E63946", votes: 1400, status: "leading", margin: 200, photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771154827.jpg" },
      { id: "c8", name: "Mahesh Basnet", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 1200, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770372449.jpg" },
      { id: "c9", name: "Kavir Rana", partyShortName: "NC", partyColor: "#2196F3", votes: 171, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771418082.jpg" },
    ],
  },
  {
    constituency: "Chitwan-2",
    constituencySlug: "chitwan-2",
    province: "Bagmati",
    totalVotes: 5216,
    countingStatus: "Counting in progress",
    candidates: [
      { id: "c10", name: "Rabi Lamichhane", partyShortName: "RSP", partyColor: "#E63946", votes: 2801, status: "leading", margin: 1542, photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1772019775.png" },
      { id: "c11", name: "Ashim Ghimire", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 1259, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/6daab1b818118f6b30b5a2e9dbfc9e56.jpg" },
      { id: "c12", name: "Pratap Gurung", partyShortName: "NCP", partyColor: "#FF5722", votes: 1156, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/14d76441a27e4fc5ca12b1cf7bc93724.jpg" },
    ],
  },
  {
    constituency: "Kathmandu-3",
    constituencySlug: "kathmandu-3",
    province: "Bagmati",
    totalVotes: 9471,
    countingStatus: "Counting in progress",
    candidates: [
      { id: "c13", name: "Raju Nath Pandey", partyShortName: "RSP", partyColor: "#E63946", votes: 4649, status: "leading", margin: 1308, photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770799526.png" },
      { id: "c14", name: "Kulman Ghising", partyShortName: "Ujaylo", partyColor: "#FFC107", votes: 3341, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770799398.png" },
      { id: "c15", name: "Ramesh Aryal", partyShortName: "NC", partyColor: "#2196F3", votes: 1481, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770799509.png" },
    ],
  },
  {
    constituency: "Lalitpur-3",
    constituencySlug: "lalitpur-3",
    province: "Bagmati",
    totalVotes: 1951,
    countingStatus: "Counting in progress",
    candidates: [
      { id: "c16", name: "Tosima Karki", partyShortName: "RSP", partyColor: "#E63946", votes: 1748, status: "leading", margin: 1580, photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1772017302.png" },
      { id: "c17", name: "Jitendra Kumar Shrestha", partyShortName: "NC", partyColor: "#2196F3", votes: 168, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771395265.jpg" },
      { id: "c18", name: "Raj Kaji Maharjan", partyShortName: "NCP", partyColor: "#FF5722", votes: 35, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771395555.jpg" },
    ],
  },
  {
    constituency: "Tanahun-1",
    constituencySlug: "tanahun-1",
    province: "Gandaki",
    totalVotes: 2358,
    countingStatus: "Counting in progress",
    candidates: [
      { id: "c19", name: "Swarnim Wagle", partyShortName: "RSP", partyColor: "#E63946", votes: 1352, status: "leading", margin: 762, photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771421203.jpg" },
      { id: "c20", name: "Govind Bhattarai", partyShortName: "NC", partyColor: "#2196F3", votes: 590, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771421514.jpg" },
      { id: "c21", name: "Bhagwati Neupane", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 416, status: "trailing", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771421617.jpg" },
    ],
  },
  {
    constituency: "Rautahat-1",
    constituencySlug: "rautahat-1",
    province: "Madhesh",
    totalVotes: 0,
    countingStatus: "Counting not started",
    candidates: [
      { id: "c22", name: "Madhav Kumar Nepal", partyShortName: "NCP", partyColor: "#FF5722", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/c86e9c9e6d62bfa32ae98691cbfe3ac7.jpeg" },
      { id: "c23", name: "Anil Kumar Jha", partyShortName: "NC", partyColor: "#2196F3", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/7b36f60f37895add3296b4564fb817be.jpg" },
      { id: "c24", name: "Ajay Kumar Gupta", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/ceb984aca912b58124ce692e71f14b55.jpg" },
    ],
  },
  {
    constituency: "Myagdi-1",
    constituencySlug: "myagdi-1",
    province: "Gandaki",
    totalVotes: 0,
    countingStatus: "Counting not started",
    candidates: [
      { id: "c25", name: "Mahabir Pun", partyShortName: "IND", partyColor: "#9E9E9E", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771575628.jpg" },
      { id: "c26", name: "Harikrishna Shrestha", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771575331.jpg" },
      { id: "c27", name: "Karna Bahadur Bhandari", partyShortName: "NC", partyColor: "#2196F3", votes: 0, status: "pending", photo: "https://jcss-generalelection2082.ekantipur.com/assets/images/user-placeholder.svg" },
    ],
  },
  {
    constituency: "Siraha-1",
    constituencySlug: "siraha-1",
    province: "Madhesh",
    totalVotes: 0,
    countingStatus: "Counting not started",
    candidates: [
      { id: "c28", name: "Bablu Gupta", partyShortName: "RSP", partyColor: "#E63946", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/dbde16e204b625b7bc2804ff67290208.jpg" },
      { id: "c29", name: "Ram Shankar Yadav", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/ba9b8064edd279debf5ed11ac79f9a39.jpg" },
      { id: "c30", name: "Ram Sundar Chaudhary", partyShortName: "NC", partyColor: "#2196F3", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/d573d0dbc48e296b963988b98441a48d.jpg" },
    ],
  },
  {
    constituency: "Gulmi-1",
    constituencySlug: "gulmi-1",
    province: "Lumbini",
    totalVotes: 0,
    countingStatus: "Counting not started",
    candidates: [
      { id: "c31", name: "Sagar Dhakal", partyShortName: "RSP", partyColor: "#E63946", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771420551.jpg" },
      { id: "c32", name: "Pradip Kumar Gyawali", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771420622.jpg" },
      { id: "c33", name: "Chandrakant Bhandari", partyShortName: "NC", partyColor: "#2196F3", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771420721.jpg" },
    ],
  },
  {
    constituency: "Gorkha-1",
    constituencySlug: "gorkha-1",
    province: "Gandaki",
    totalVotes: 0,
    countingStatus: "Counting not started",
    candidates: [
      { id: "c34", name: "Sudhan Gurung", partyShortName: "RSP", partyColor: "#E63946", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771921198.png" },
      { id: "c35", name: "Ram Chandra Lamichhane", partyShortName: "CPN-UML", partyColor: "#F44336", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/22ef0e18571dbb88790a919b8d6425f7.jpg" },
      { id: "c36", name: "Prem Kumar Khatri", partyShortName: "NC", partyColor: "#2196F3", votes: 0, status: "pending", photo: "https://assets-generalelection2082.ekantipur.com/candidates/7bb33855391e8ead0a81620497457d53.jpg" },
    ],
  },
];
