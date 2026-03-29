// Car Database for Car King Game
// Contains all car data, images, voice paths, and facts.

window.CAR_DATABASE = [
    {
        name: "Aston Martin",
        images: ["assets/cars/astonMartin/AstonMartin.png", "assets/cars/astonMartin/AstonMartin1.png"],
        voice: "assets/cars/astonMartin/astonMartin.mp3",
        keywords: ["aston", "martin", "as-ton", "mar-tin"],
        funFact: "Aston Martin serves as the main car for James Bond!"
    },
    {
        name: "Audi R8",
        images: ["assets/cars/AudiR8/AudiR8.png"],
        voice: "assets/cars/AudiR8/AudiR8.mp3",
        contextualPhrases: ["Audi R8", "Audi", "R8", "Audi sports car"],
        speechAliases: ["audi are eight", "audi r eight", "aldi r8", "aldi are eight"],
        keywords: ["audi", "r8", "are-eight", "aldi"],
        funFact: "The Audi R8 shares many parts with a Lamborghini!"
    },
    {
        name: "BMW",
        images: ["assets/cars/BMW/BMW.jpg"],
        voice: "assets/cars/BMW/BMW.mp3",
        contextualPhrases: ["BMW", "B M W", "BMW car"],
        speechAliases: ["b m w", "bee em w", "bee em double u"],
        keywords: ["bmw", "bimmer", "beamer", "bee em", "bee em double u"],
        funFact: "BMW started by making airplane engines before cars!"
    },
    {
        name: "Bentley",
        images: ["assets/cars/Bentley/Bentley.jpg"],
        voice: "assets/cars/Bentley/Bentley.mp3",
        keywords: ["bentley", "bent-lee", "bent-lee"],
        funFact: "Bentley cars are super fancy and even have refrigerators inside!"
    },
    {
        name: "Bugatti",
        images: ["assets/cars/Bugatti/Bugatti.png"],
        voice: "assets/cars/Bugatti/Bugatti.mp3",
        keywords: ["bugatti", "boo-gah-tee"],
        funFact: "The Bugatti is one of the fastest cars in the whole world!"
    },
    {
        name: "Corvette",
        images: ["assets/cars/Corvette/Corvette.png"],
        voice: "assets/cars/Corvette/Corvette.mp3",
        keywords: ["corvette", "chevy", "chevrolet", "stingray"],
        funFact: "The Corvette is an American sports car icon!"
    },
    {
        name: "Cybertruck",
        images: ["assets/cars/Cybertruck/Cybertruck.png"],
        voice: "assets/cars/Cybertruck/Cybertruck.mp3",
        keywords: ["cybertruck", "cyber-truck", "si-ber-truck",],
        funFact: "This truck looks like it came from a video game!"
    },
    {
        name: "Dodge Ram",
        images: ["assets/cars/DodgeRam/DodgeRam.png"],
        voice: "assets/cars/DodgeRam/DodgeRam.mp3",
        actualWords: ["Dodge Ram", "Ram"],
        keywords: ["ram", "dodge", "ram-truck", "dodge-ram"],
        funFact: "Ram trucks are super strong and tough!"
    },
    {
        name: "Ferrari",
        images: ["assets/cars/ferrari/Ferrari.png", "assets/cars/ferrari/Ferrari1.jpg", "assets/cars/ferrari/ferrari.jpg"],
        voice: "assets/cars/ferrari/ferrari.mp3",
        keywords: ["ferrari", "fe-rar-ee"],
        funFact: "Ferrari's logo is a prancing horse!"
    },
    {
        name: "Hellcat",
        images: ["assets/cars/Hellcat/Hellcat.png"],
        voice: "assets/cars/Hellcat/Hellcat.mp3",
        actualWords: ["Hellcat", "Dodge Challenger", "Dodge Charger"],
        keywords: ["hellcat", "dodge", "challenger", "charger"],
        funFact: "The Hellcat engine makes a super loud roar!"
    },
    {
        name: "Honda Civic",
        images: ["assets/cars/HondaCivic/HondaCivic.png"],
        voice: "assets/cars/HondaCivic/HondaCivic.mp3",
        actualWords: ["Honda Civic", "Civic"],
        contextualPhrases: ["Honda Civic", "Civic", "Honda car"],
        speechAliases: ["honda sivic", "civick", "see vic"],
        keywords: ["honda", "civic", "ho-n-da", "si-vic"],
        funFact: "The Honda Civic is one of the most popular cars ever!"
    },
    {
        name: "Honda Pilot",
        images: ["assets/cars/HondaPilot/HondaPilot.png"],
        voice: "assets/cars/HondaPilot/HondaPilot.mp3",
        actualWords: ["Honda Pilot", "Pilot"],
        contextualPhrases: ["Honda Pilot", "Pilot", "Honda SUV"],
        speechAliases: ["honda pie lot", "pie lot"],
        keywords: ["honda", "pilot", "ho-n-da", "pi-lot"],
        funFact: "The Pilot is perfect for big family road trips!"
    },
    {
        name: "Jaguar",
        images: ["assets/cars/Jaguar/Jaguar.png"],
        voice: "assets/cars/Jaguar/Jaguar.mp3",
        keywords: ["jaguar", "jag", "ja-guar"],
        funFact: "Jaguars are named after a fast jungle cat!"
    },
    {
        name: "Lamborghini",
        images: ["assets/cars/Lamborghini/Lamborghini.png", "assets/cars/Lamborghini/Lamborghini1.jpg"],
        voice: "assets/cars/Lamborghini/Lamborghini.mp3",
        keywords: ["lamborghini", "lambo", "lam-bor-gee-nee"],
        funFact: "Lamborghini started because the owner was mad at Ferrari!"
    },
    {
        name: "Lancer Evo",
        images: ["assets/cars/LancerEvolution/LancerEvolution.png"],
        voice: "assets/cars/LancerEvolution/LancerEvolution.mp3",
        keywords: ["lancer", "evo", "mitsubishi", "lan-cer", "e-vo", "mit-su-bi-shi", "evolution", "e-vo-lu-tion"],
        funFact: "The Evo is a legendary rally racing car!"
    },
    {
        name: "Lotus",
        images: ["assets/cars/Lotus/lotus1.jpg", "assets/cars/Lotus/lotus2.jpg", "assets/cars/Lotus/lotus3.jpg"],
        voice: "assets/cars/Lotus/Lotus.mp3",
        keywords: ["lotus", "elise", "lo-tus", "e-lise"],
        funFact: "Lotus cars are super light and handle like go-karts!"
    },
    {
        name: "Maserati",
        images: ["assets/cars/Masarati/Masarati.png"],
        voice: "assets/cars/Masarati/Masarati.mp3",
        keywords: ["maserati", "ma-sa-ra-ti"],
        funFact: "Maserati engines make a beautiful musical sound!"
    },
    {
        name: "Mazda Miata",
        images: ["assets/cars/MazdaMiata/MazdaMiata.png"],
        voice: "assets/cars/MazdaMiata/MazdaMiata.mp3",
        keywords: ["miata", "mazda", "mx5", "ma-za-da", "mi-a-ta"],
        funFact: "The Miata is the best-selling roadster in history!"
    },
    {
        name: "Mercedes",
        images: ["assets/cars/Mercedes/Mercedes.png", "assets/cars/Mercedes/Mercedes1.png", "assets/cars/Mercedes/Mercedes2.jpg"],
        voice: "assets/cars/Mercedes/Mercedes.mp3",
        keywords: ["mercedes", "benz", "amg", "mer-ce-des", "ben-z"],
        funFact: "Mercedes invented the very first car!"
    },
    {
        name: "Mini Cooper",
        images: ["assets/cars/MiniCooper/Minicooper.png"],
        voice: "assets/cars/MiniCooper/MiniCooper.mp3",
        keywords: ["mini", "cooper", "mi-ni", "coo-per"],
        funFact: "The Mini Cooper is small but super zippy!"
    },
    {
        name: "Porsche",
        images: ["assets/cars/Porshe/Porshe.png"],
        voice: "assets/cars/Porshe/Porshe.mp3",
        contextualPhrases: ["Porsche", "Porsche car", "911 Porsche"],
        speechAliases: ["por sha", "por she", "porsha"],
        keywords: ["porsche", "911", "turbo", "por-she", "por-sha"],
        funFact: "Porsche keys go on the left side of the steering wheel!"
    },
    {
        name: "Nissan GT-R",
        images: ["assets/cars/SKylinGTR/SKylinGTR.png", "assets/cars/SKylinGTR/SKylinGTR1.jpg"],
        voice: "assets/cars/SKylinGTR/SKylinGTR.mp3",
        actualWords: ["Nissan GT-R", "GT-R", "Skyline", "Godzilla"],
        contextualPhrases: ["Nissan GT-R", "GT-R", "Skyline GT-R", "Godzilla car"],
        speechAliases: ["nissan g t r", "g t r", "sky line", "godzilla car"],
        keywords: ["skyline", "gtr", "nissan", "sky-line", "g-t-r", "ni-ssan"],
        funFact: "The GT-R is nicknamed 'Godzilla' because it's a monster!"
    },
    {
        name: "Subaru WRX",
        images: ["assets/cars/SubaruWRX/SubaruWRX.png", "assets/cars/SubaruWRX/SubaruWRX1.png"],
        voice: "assets/cars/SubaruWRX/SubaruWRX.mp3",
        actualWords: ["Subaru WRX", "WRX", "STI"],
        keywords: ["subaru", "wrx", "sti", "su-ba-ru", "w-r-x"],
        funFact: "Subaru cars can drive easily on snow and dirt!"
    },
    {
        name: "Toyota Supra",
        images: ["assets/cars/Supra/Supra.png"],
        voice: "assets/cars/Supra/Supra.mp3",
        actualWords: ["Toyota Supra", "Supra"],
        keywords: ["supra", "toyota", "su-pra", "to-yo-ta"],
        funFact: "The Supra is a movie star car from Fast & Furious!"
    },
    {
        name: "Tesla",
        images: ["assets/cars/tesla/Tesla.png", "assets/cars/tesla/Tesla1.png", "assets/cars/tesla/tesla.jpg"],
        voice: "assets/cars/tesla/tesla.mp3",
        keywords: ["tesla", "te-sla"],
        funFact: "Teslas don't need gas, they run on electricity!"
    },
    {
        name: "Toyota Camry",
        images: ["assets/cars/ToyotaCamry/ToyotaCamry.png"],
        voice: "assets/cars/ToyotaCamry/ToyotaCamry.mp3",
        actualWords: ["Toyota Camry", "Camry"],
        contextualPhrases: ["Toyota Camry", "Camry", "Toyota car"],
        speechAliases: ["toyo ta camry", "cam ree"],
        keywords: ["camry", "toyota", "ca-m-ry", "to-yo-ta"],
        funFact: "The Camry is one of the most reliable cars ever made!"
    },
    {
        name: "Toyota Tacoma",
        images: ["assets/cars/ToyotaTacoma/ToyotaTacoma.png"],
        voice: "assets/cars/ToyotaTacoma/ToyotaTacoma.mp3",
        actualWords: ["Toyota Tacoma", "Tacoma"],
        contextualPhrases: ["Toyota Tacoma", "Tacoma", "Toyota truck"],
        speechAliases: ["toyo ta tacoma", "ta coma"],
        keywords: ["toyota", "tacoma", "to-yo-ta", "ta-co-ma"],
        funFact: "The Tacoma is so tough it can drive over volcanoes!"
    },
    {
        name: "Toyota Tundra",
        images: ["assets/cars/ToyotaTundra/ToyotaTundra.png"],
        voice: "assets/cars/ToyotaTundra/ToyotaTundra.mp3",
        actualWords: ["Toyota Tundra", "Tundra"],
        contextualPhrases: ["Toyota Tundra", "Tundra", "Toyota truck"],
        speechAliases: ["toyo ta tundra", "tun dra", "tondra"],
        keywords: ["tundra", "toyota", "tun-dra", "to-yo-ta"],
        funFact: "The Tundra once pulled a giant space shuttle!"
    },
    {
        name: "Volkswagen",
        images: ["assets/cars/Volkswagon/Volkswagon.png", "assets/cars/Volkswagon/Volkswagon1.png"],
        voice: "assets/cars/Volkswagon/Volkswagon.mp3",
        keywords: ["vw", "volkswagen", "vol-ks-wa-gen"],
        funFact: "Volkswagen means 'People's Car' in German!"
    },
    {
        name: "Buick",
        images: ["assets/cars/Buick/Buick1.jpg", "assets/cars/Buick/Buick2.jpg", "assets/cars/Buick/Buick3.jpg", "assets/cars/Buick/Buick4.jpg"],
        voice: "assets/cars/Buick/Buick.mp3",
        keywords: ["buick", "bu-ick"],
        funFact: "Buick is one of the oldest car brands in the world!"
    },
    {
        name: "Cadillac",
        images: ["assets/cars/Cadillac/Cadillac1.jpg", "assets/cars/Cadillac/Cadillac2.jpg", "assets/cars/Cadillac/Cadillac3.jpg", "assets/cars/Cadillac/Cadillac4.avif", "assets/cars/Cadillac/Cadillac5.jpg", "assets/cars/Cadillac/Cadillac6.jpg"],
        voice: "assets/cars/Cadillac/Cadillac.mp3",
        keywords: ["cadillac", "caddy", "ca-dil-lac"],
        funFact: "Cadillac cars are known for being super fancy and comfortable!"
    },
    {
        name: "Chrysler",
        images: ["assets/cars/Chrysler/Chrysler1.jpg", "assets/cars/Chrysler/Chyrsler2.jpg", "assets/cars/Chrysler/Chyrsler3.avif", "assets/cars/Chrysler/Chyrsler4.jpg", "assets/cars/Chrysler/Chyrsler5.jpg"],
        voice: "assets/cars/Chrysler/Chrysler.mp3",
        keywords: ["chrysler", "chry-sler"],
        funFact: "Chrysler made the first minivan which is great for families!"
    },
    {
        name: "Ford Explorer",
        images: ["assets/cars/FordExplorer/FordExplorer1.avif", "assets/cars/FordExplorer/FordExplorer2.avif", "assets/cars/FordExplorer/FordExplorer3.avif", "assets/cars/FordExplorer/FordExplorer4.avif"],
        voice: "assets/cars/FordExplorer/FordExplorer.mp3",
        actualWords: ["Ford Explorer", "Explorer"],
        contextualPhrases: ["Ford Explorer", "Explorer", "Ford SUV"],
        speechAliases: ["ford explora", "explora"],
        keywords: ["explorer", "ford", "ex-plor-er", "f-o-r-d"],
        funFact: "The Ford Explorer is one of the most popular SUVs ever!"
    },
    {
        name: "Ford F-150",
        images: ["assets/cars/FordF150/FordF1501.webp", "assets/cars/FordF150/FordF1502.jpg", "assets/cars/FordF150/FordF1503.webp", "assets/cars/FordF150/FordF1504.avif", "assets/cars/FordF150/FordF1505.jpg"],
        voice: "assets/cars/FordF150/FordF150.mp3",
        actualWords: ["Ford F-150", "F-150", "F One Fifty"],
        contextualPhrases: ["Ford F-150", "F-150", "Ford truck"],
        speechAliases: ["ford f one fifty", "f one fifty", "eff one fifty", "f one five zero"],
        keywords: ["f150", "ford", "f one fifty", "eff one fifty", "one fifty"],
        funFact: "The Ford F-150 has been the best-selling truck for over 40 years!"
    },
    {
        name: "GMC Sierra",
        images: ["assets/cars/GMCsierra/GMCsierra1.jpg", "assets/cars/GMCsierra/GMCsierra2.jpg", "assets/cars/GMCsierra/GMCsierra3.jpg", "assets/cars/GMCsierra/GMCsierra4.avif", "assets/cars/GMCsierra/GMCsierra5.webp", "assets/cars/GMCsierra/GMCsierra6.avif"],
        voice: "assets/cars/GMCsierra/GMCsierra.mp3",
        keywords: ["gmc", "sierra", "g-m-c", "si-er-ra"],
        funFact: "GMC Sierra trucks are big, strong, and luxurious!"
    },
    {
        name: "Hyundai",
        images: ["assets/cars/Hyundai/Hyundai.jpg", "assets/cars/Hyundai/Hyundai1.jpg", "assets/cars/Hyundai/Hyundai2.jpg", "assets/cars/Hyundai/Hyundai3.jpg"],
        voice: "assets/cars/Hyundai/Hyundai.mp3",
        keywords: ["hyundai", "hy-un-dai"],
        funFact: "Hyundai makes cool robots that can walk just like dogs!"
    },
    {
        name: "Infiniti",
        images: ["assets/cars/Infiniti/Infiniti1.jpg", "assets/cars/Infiniti/Infiniti2.jpg", "assets/cars/Infiniti/Infiniti3.jpg", "assets/cars/Infiniti/Infiniti4.jpg", "assets/cars/Infiniti/Infiniti5.jpg", "assets/cars/Infiniti/Infinit3.webp"],
        voice: "assets/cars/Infiniti/Infiniti.mp3",
        keywords: ["infiniti", "in-fin-i-ti"],
        funFact: "Infiniti is the luxury version of Nissan cars!"
    },
    {
        name: "Jeep Wrangler",
        images: ["assets/cars/JeepWrangler/JeepWrangler1.avif", "assets/cars/JeepWrangler/JeepWrangler2.avif", "assets/cars/JeepWrangler/JeepWrangler3.avif", "assets/cars/JeepWrangler/JeepWrangler4.avif", "assets/cars/JeepWrangler/JeepWrangler5.avif", "assets/cars/JeepWrangler/JeepWrangler6.avif"],
        voice: "assets/cars/JeepWrangler/JeepWrangler.mp3",
        keywords: ["jeep", "wrangler", "jee-p", "wran-gler", "je-ep", "je-ep wrang-ler"],
        funFact: "You can take the doors and roof off of a Jeep Wrangler!"
    },
    {
        name: "Kia",
        images: ["assets/cars/Kia/Kia.avif", "assets/cars/Kia/Kia1.jpg", "assets/cars/Kia/Kia2.jpg", "assets/cars/Kia/Kia3.jpg"],
        voice: "assets/cars/Kia/Kia.mp3",
        keywords: ["kia", "ki-a"],
        funFact: "Kia offers a 10-year warranty because they are so reliable!"
    },
    {
        name: "Nissan 370Z",
        images: ["assets/cars/Nissan370z/Nissan370z1.avif", "assets/cars/Nissan370z/Nissan370z2.avif", "assets/cars/Nissan370z/Nissan370z3.avif", "assets/cars/Nissan370z/Nissan370z4.avif"],
        voice: "assets/cars/Nissan370z/Nissan370z.mp3",
        actualWords: ["Nissan 370Z", "370Z", "Three Seventy Z"],
        contextualPhrases: ["Nissan 370Z", "370Z", "Nissan Z car"],
        speechAliases: ["nissan three seventy z", "three seventy zee", "370 z"],
        keywords: ["370z", "nissan", "three seventy z", "370 z", "ni-ssan", "ni-ssan three seventy z"],
        funFact: "The Nissan Z cars have been famous sports cars for 50 years!"
    },
    {
        name: "Toyota Celica",
        images: ["assets/cars/ToyotaCelica/ToyotaCelica1.avif", "assets/cars/ToyotaCelica/ToyotaCelica2.webp", "assets/cars/ToyotaCelica/ToyotaCelica3.jpg", "assets/cars/ToyotaCelica/ToyotaCelica4.jpeg"],
        voice: "assets/cars/ToyotaCelica/ToyotaCelica.mp3",
        actualWords: ["Toyota Celica", "Celica"],
        contextualPhrases: ["Toyota Celica", "Celica", "Toyota sports car"],
        keywords: ["celica", "toyota", "to-yo-ta", "ce-li-ca"],
        funFact: "The Toyota Celica was a champion inside rally racing!"
    }
];
