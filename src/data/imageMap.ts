/**
 * Image asset mapping for the election app.
 * 
 * All party logos and candidate photos are stored locally as SVG files
 * in the public/assets/images directory.
 * 
 * Original source: election.ekantipur.com (assets-generalelection2082.ekantipur.com)
 */

export const partyImageMap: Record<string, { local: string; remote: string }> = {
  RSP: {
    local: "/assets/images/parties/rsp.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770792349.png",
  },
  NC: {
    local: "/assets/images/parties/nc.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770710566.png",
  },
  NCP: {
    local: "/assets/images/parties/ncp.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770793102.png",
  },
  "CPN-UML": {
    local: "/assets/images/parties/cpn-uml.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770710534.png",
  },
  RPP: {
    local: "/assets/images/parties/rpp.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770793829.png",
  },
  JSP: {
    local: "/assets/images/parties/jsp.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770792403.png",
  },
  SSP: {
    local: "/assets/images/parties/ssp.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770793904.png",
  },
  Maoist: {
    local: "/assets/images/parties/maoist.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770797745.png",
  },
  Ujaylo: {
    local: "/assets/images/parties/ujaylo.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770794244.png",
  },
  RMP: {
    local: "/assets/images/parties/rmp.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1772011143.jpg",
  },
  JP: {
    local: "/assets/images/parties/jp.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770792211.png",
  },
  NUP: {
    local: "/assets/images/parties/nup.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1772012045.jpg",
  },
  IND: {
    local: "/assets/images/parties/ind.svg",
    remote: "https://assets-generalelection2082.ekantipur.com/parties/party-1770810367.png",
  },
  Others: {
    local: "/assets/images/parties/others.svg",
    remote: "",
  },
};

export const candidateImageMap: Record<string, { local: string; remote: string }> = {
  "Balendra Shah": {
    local: "https://assets-generalelection2082.ekantipur.com/candidates/e1f8a9c79c776cc8f747784aec9f43b8.jpg",
    remote: "https://assets-generalelection2082.ekantipur.com/candidates/e1f8a9c79c776cc8f747784aec9f43b8.jpg",
  },
  "KP Sharma Oli": {
    local: "https://assets-generalelection2082.ekantipur.com/candidates/5e4bc046e2a1d5f43f579cc48158d31f.jpg",
    remote: "https://assets-generalelection2082.ekantipur.com/candidates/5e4bc046e2a1d5f43f579cc48158d31f.jpg",
  },
  "Pushpa Kamal Dahal": {
    local: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770873766.jpg",
    remote: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1770873766.jpg",
  },
  "Rabi Lamichhane": {
    local: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1772019775.png",
    remote: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1772019775.png",
  },
  "Mahabir Pun": {
    local: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771575628.jpg",
    remote: "https://assets-generalelection2082.ekantipur.com/candidates/candidate-1771575628.jpg",
  },
};
