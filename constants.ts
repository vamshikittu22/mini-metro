
export const THEME = {
  background: '#F8F4EE', // Warm Swiss-style off-white
  water: '#D8E2EB',      // Desaturated subtle water blue
  grid: '#EBE5DA',       // Subtle grid lines
  menuBg: '#1A1A1A',
  text: '#1A1A1A',
  menuText: '#FFFFFF',
  accentBlue: '#3E86C6',
  accentGreen: '#2ECC71',
  stationStroke: '#1A1A1A',
  lineColors: [
    '#EF3340', // Red
    '#0038A8', // Royal Blue
    '#009639', // Green
    '#FFD100', // Yellow
    '#72246C', // Purple
    '#FF8200', // Orange
    '#E40066', // Magenta/Pink
    '#00AFAD', // Cyan
    '#8B4513', // Brown
    '#707070'  // Steel Gray
  ],
  lineWidth: 8,
  stationSize: 22,
  passengerSize: 8,
  trainWidth: 54,  
  trainHeight: 30, 
  timerThreshold: 10000, 
};

export const GAME_CONFIG = {
  maxPassengers: 8,
  softCapacity: 6,
  trainCapacity: 6, 
  spawnRate: 4000, 
  stationSpawnRate: 30000, 
  trainSpeed: 0.002, 
};

export const LONDON_STATIONS = [
  "Victoria", "Paddington", "King's Cross", "Oxford Circus", "Waterloo", 
  "Chelsea", "Westminster", "Liverpool St", "Euston", "Bond St", 
  "Leicester Sq", "Green Park", "South Kensington", "Knightsbridge", 
  "Piccadilly Circus", "Marylebone", "Baker St", "Embankment", 
  "Covent Garden", "Angel", "Brixton", "Camden Town", "Clapham", 
  "Elephant & Castle", "Farringdon", "Holborn", "Mansion House", 
  "Notting Hill Gate", "Shepherd's Bush", "Vauxhall", "White City"
];

export const CITY_STATION_POOLS: Record<string, string[]> = {
  london: LONDON_STATIONS,
  paris: ["Châtelet", "Gare du Nord", "Montparnasse", "Bastille", "République", "Opéra", "Étoile", "Louvre", "Pigalle", "Saint-Lazare"],
  nyc: ["Grand Central", "Penn Station", "Times Square", "Wall Street", "Fulton St", "Canal St", "Union Sq", "Atlantic Av", "Columbus Circle", "World Trade Center"],
  tokyo: ["Shinjuku", "Shibuya", "Tokyo", "Ueno", "Ikebukuro", "Shinagawa", "Akihabara", "Ginza", "Roppongi", "Asakusa"],
  berlin: ["Hauptbahnhof", "Alexanderplatz", "Zoologischer Garten", "Friedrichstraße", "Potsdamer Platz", "Gesundbrunnen", "Ostkreuz", "Südkreuz", "Warschauer Straße"],
  seoul: ["Seoul Station", "Gangnam", "Myeongdong", "Hongdae", "Itaewon", "Dongdaemun", "Sinchon", "Jamsil", "Yeouido"],
  sydney: ["Town Hall", "Circular Quay", "Central", "Wynyard", "Bondi Junction", "Parramatta", "Chatswood", "North Sydney"],
  mumbai: ["CSMT", "Churchgate", "Dadar", "Andheri", "Bandra", "Kurla", "Borivali", "Thane", "Panvel"],
  cairo: ["Tahrir", "Ramses", "Giza", "Heliopolis", "Maadi", "Zamalek", "Dokki", "Nasr City"],
  rio: ["Centro", "Ipanema", "Copacabana", "Botafogo", "Tijuca", "Maracanã", "Barra", "Lapa"],
  moscow: ["Kremlin", "Arbat", "Tverskaya", "Lubyanka", "Taganskaya", "Kievskaya", "Kurskaya", "Belorusskaya"],
  beijing: ["Tiananmen", "Wangfujing", "Sanlitun", "Xidan", "Huilongguan", "Dongzhimen", "Guomao", "Zhongguancun"],
  toronto: ["Union", "Bloor-Yonge", "St George", "Spadina", "Eglinton", "Sheppard", "Finch", "Dundas", "King"],
  barcelona: ["Catalunya", "Sants", "Passeig de Gràcia", "Diagonal", "Sagrada Família", "Espanya", "Les Corts", "Gràcia"],
  amsterdam: ["Centraal", "Zuid", "Amstel", "Sloterdijk", "Muiderpoort", "Lelylaan", "Bijlmer", "Noord"],
  rome: ["Termini", "Tiburtina", "Ostiense", "Flaminio", "Colosseo", "Ottaviano", "Garbatella", "Trastevere"],
  istanbul: ["Sultanahmet", "Taksim", "Kadikoy", "Besiktas", "Üsküdar", "Levent", "Sisli", "Bakirköy"],
  stockholm: ["T-Centralen", "Slussen", "Gamla Stan", "Odenplan", "Fridhemsplan", "Gullmarsplan", "Tekniska"],
  mexico: ["Zócalo", "Condesa", "Polanco", "Tlatelolco", "Insurgentes", "Chapultepec", "Coyoacán", "Hidalgo"],
  singapore: ["Raffles Place", "Orchard", "Bishan", "Jurong East", "Tampines", "Dhoby Ghaut", "Novena", "Serangoon"]
};
