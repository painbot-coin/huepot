/**
 * The hall, the seat, the store sentence, and the house's daily lines,
 * in the language already picked. Classic stays the name of the pot.
 */

import { hallDoors, type HallDoor } from "@/lib/hall-doors";
import { HOUSE_SEATS, type HouseSeatId } from "@/lib/house-seats";
import { DEFAULT_LOCALE, type LocaleId } from "@/lib/locale";

const DAY_KEYS = [
  "Classic",
  "The hour",
  "Games",
  "The store",
  "The vault",
  "A seat",
  "Letters",
  "Jobs",
  "Fairness",
  "The house",
] as const;

type DayKey = (typeof DAY_KEYS)[number];

type SeatFace = { label: string; who: string; tag: string };

type Tongue = {
  doors: [string, string, string, string];
  lines: [string, string, string, string];
  seats: Record<HouseSeatId, SeatFace>;
  seatTitle: string;
  seatLead: string;
  store: string;
  pot: string;
  day: Record<DayKey, { title: string; body: string }>;
};

function day(
  classic: string,
  hour: string,
  games: string,
  store: string,
  vault: string,
  seat: string,
  letters: string,
  jobs: string,
  fairness: string,
  house: string,
  titles: Tongue["doors"] extends never ? never : Record<DayKey, string>,
): Tongue["day"] {
  const bodies: Record<DayKey, string> = {
    Classic: classic,
    "The hour": hour,
    Games: games,
    "The store": store,
    "The vault": vault,
    "A seat": seat,
    Letters: letters,
    Jobs: jobs,
    Fairness: fairness,
    "The house": house,
  };
  return {
    Classic: { title: titles.Classic, body: bodies.Classic },
    "The hour": { title: titles["The hour"], body: bodies["The hour"] },
    Games: { title: titles.Games, body: bodies.Games },
    "The store": { title: titles["The store"], body: bodies["The store"] },
    "The vault": { title: titles["The vault"], body: bodies["The vault"] },
    "A seat": { title: titles["A seat"], body: bodies["A seat"] },
    Letters: { title: titles.Letters, body: bodies.Letters },
    Jobs: { title: titles.Jobs, body: bodies.Jobs },
    Fairness: { title: titles.Fairness, body: bodies.Fairness },
    "The house": { title: titles["The house"], body: bodies["The house"] },
  };
}

const en: Tongue = {
  doors: ["Sit a color", "Sit a book", "Meet a seat", "Read the house"],
  lines: [
    "Classic holds the pot.",
    "Watch a sit, then take the file.",
    "A person, a craft, or just here.",
    "The house posts about doors that exist.",
  ],
  seats: {
    game: { label: "Game developer", who: "Ships a game or a tool.", tag: "Game" },
    ai: { label: "AI developer", who: "Trains a model.", tag: "AI" },
    gamer: { label: "Gamer", who: "Plays the games.", tag: "Play" },
    better: { label: "Bettor", who: "Plays the tables.", tag: "Table" },
    here: { label: "Here", who: "A seat. No craft required.", tag: "Here" },
  },
  seatTitle: "A craft, or just here.",
  seatLead: "Game, AI, play, and the table stay. You can also sit with no craft.",
  store: "A free file downloads. A priced file needs gold.",
  pot: "The pot stays on Classic.",
  day: day(
    "Same price on every color. Biggest color takes the rest. The pot stays on Classic.",
    "The clock names the hour. Night and Fog change the table only while they are on.",
    "Sit a book on the desk, then take the file from the store. Down stays low. Burst takes a four. Catch covers both sides. Snake counts food. Aim closes the flick. Lane waits for the ripe mark. Break clears a wall.",
    "A free file downloads. A priced file needs gold. The card shows the watch. The file is that book.",
    "Gold added for a priced book stays on that sit. USDT buys a priced file, not a bonus.",
    "A profile shows takes, hues, and owned books. Balance stays on the vault.",
    "A letter stays a letter.",
    "Jobs stay the house desk. Read free. Apply from an account.",
    "The last take opens its checks in one step.",
    "Game, AI, play, and betting — same house.",
    {
      Classic: "Classic",
      "The hour": "The hour",
      Games: "Games",
      "The store": "The store",
      "The vault": "The vault",
      "A seat": "A seat",
      Letters: "Letters",
      Jobs: "Jobs",
      Fairness: "Fairness",
      "The house": "The house",
    },
  ),
};

const es: Tongue = {
  doors: ["Siéntate en un color", "Siéntate en un libro", "Conoce un asiento", "Lee la casa"],
  lines: [
    "Classic guarda el bote.",
    "Mira una sentada y luego lleva el archivo.",
    "Una persona, un oficio, o solo aquí.",
    "La casa publica sobre puertas que existen.",
  ],
  seats: {
    game: { label: "Desarrollador de juegos", who: "Publica un juego o una herramienta.", tag: "Juego" },
    ai: { label: "Desarrollador de IA", who: "Entrena un modelo.", tag: "IA" },
    gamer: { label: "Jugador", who: "Juega los juegos.", tag: "Jugar" },
    better: { label: "Apostador", who: "Juega las mesas.", tag: "Mesa" },
    here: { label: "Aquí", who: "Un asiento. Sin oficio.", tag: "Aquí" },
  },
  seatTitle: "Un oficio, o solo aquí.",
  seatLead: "Juego, IA, jugar y la mesa siguen. También puedes sentarte sin oficio.",
  store: "Un archivo gratis se descarga. Un archivo con precio necesita oro.",
  pot: "El bote se queda en Classic.",
  day: day(
    "Mismo precio en cada color. El color más grande se lleva el resto. El bote se queda en Classic.",
    "El reloj nombra la hora. Night y Fog cambian la mesa solo mientras están activos.",
    "Siéntate en un libro en el escritorio y luego lleva el archivo de la tienda. Down se queda bajo. Burst busca un cuatro. Catch cubre ambos lados. Snake cuenta la comida. Aim cierra el gesto. Lane espera la marca madura. Break vacía el muro.",
    "Un archivo gratis se descarga. Un archivo con precio necesita oro. La tarjeta muestra la vigilancia. El archivo es ese libro.",
    "El oro añadido para un libro con precio se queda en esa sentada. USDT compra un archivo con precio, no un bono.",
    "Un perfil muestra tomas, tonos y libros propios. El saldo se queda en la bóveda.",
    "Una carta sigue siendo una carta.",
    "Los empleos se quedan en el escritorio de la casa. Se leen gratis. Se postula desde una cuenta.",
    "La última toma abre sus comprobaciones en un paso.",
    "Juego, IA, jugar y apuestas — la misma casa.",
    {
      Classic: "Classic",
      "The hour": "La hora",
      Games: "Juegos",
      "The store": "La tienda",
      "The vault": "La bóveda",
      "A seat": "Un asiento",
      Letters: "Cartas",
      Jobs: "Empleo",
      Fairness: "Equidad",
      "The house": "La casa",
    },
  ),
};

const zh: Tongue = {
  doors: ["坐一个颜色", "坐一本书", "认识一个座位", "读这座房子"],
  lines: ["Classic 守着彩池。", "先看一场坐，再带走文件。", "一个人，一门手艺，或只是在这里。", "房子只写已经存在的门。"],
  seats: {
    game: { label: "游戏开发者", who: "做出一个游戏或工具。", tag: "游戏" },
    ai: { label: "AI 开发者", who: "训练一个模型。", tag: "AI" },
    gamer: { label: "玩家", who: "玩游戏。", tag: "游玩" },
    better: { label: "下注的人", who: "坐桌子。", tag: "桌子" },
    here: { label: "在这里", who: "一个座位。不必有手艺。", tag: "在这里" },
  },
  seatTitle: "一门手艺，或只是在这里。",
  seatLead: "游戏、AI、游玩和桌子还在。你也可以不带手艺就坐。",
  store: "免费文件可下载。标价文件需要金子。",
  pot: "彩池留在 Classic。",
  day: day(
    "每个颜色同价。最多的颜色拿走其余。彩池留在 Classic。",
    "时钟说出这一小时。Night 和 Fog 只在进行时改变桌子。",
    "先在桌上坐一本书，再从商店带走文件。Down 保持低。Burst 要一个四连。Catch 盖住两侧。Snake 数食物。Aim 收住一挥。Lane 等成熟的标记。Break 清掉一堵墙。",
    "免费文件可下载。标价文件需要金子。卡片显示这一次观看。文件就是那本书。",
    "为标价书加上的金子留在那一场坐。USDT 购买标价文件，不是奖金。",
    "主页显示拿走、色调和拥有的书。余额留在金库。",
    "一封信还是一封信。",
    "工作留在房子的桌子上。免费阅读。从账户申请。",
    "最近一次拿走一步打开它的核对。",
    "游戏、AI、游玩与博彩——同一座房子。",
    {
      Classic: "Classic",
      "The hour": "这一小时",
      Games: "游戏",
      "The store": "商店",
      "The vault": "金库",
      "A seat": "一个座位",
      Letters: "信",
      Jobs: "工作",
      Fairness: "核对",
      "The house": "房子",
    },
  ),
};

const hi: Tongue = {
  doors: ["एक रंग पर बैठो", "एक किताब पर बैठो", "एक सीट से मिलो", "घर पढ़ो"],
  lines: ["Classic बर्तन संभालता है।", "एक बैठक देखो, फिर फ़ाइल ले जाओ।", "एक व्यक्ति, एक हुनर, या बस यहाँ।", "घर उन्हीं दरवाज़ों के बारे में लिखता है जो हैं।"],
  seats: {
    game: { label: "गेम डेवलपर", who: "एक खेल या औज़ार बनाता है।", tag: "गेम" },
    ai: { label: "AI डेवलपर", who: "एक मॉडल सिखाता है।", tag: "AI" },
    gamer: { label: "खिलाड़ी", who: "खेल खेलता है।", tag: "खेल" },
    better: { label: "दाँव लगाने वाला", who: "मेज़ों पर बैठता है।", tag: "मेज़" },
    here: { label: "यहाँ", who: "एक सीट। हुनर ज़रूरी नहीं।", tag: "यहाँ" },
  },
  seatTitle: "एक हुनर, या बस यहाँ।",
  seatLead: "गेम, AI, खेल और मेज़ रहते हैं। बिना हुनर भी बैठ सकते हो।",
  store: "मुफ़्त फ़ाइल उतरती है। कीमत वाली फ़ाइल को सोना चाहिए।",
  pot: "बर्तन Classic पर रहता है।",
  day: day(
    "हर रंग एक ही कीमत। सबसे बड़ा रंग बाकी ले जाता है। बर्तन Classic पर रहता है।",
    "घड़ी घंटे का नाम लेती है। Night और Fog मेज़ तभी बदलते हैं जब वे चालू हों।",
    "डेस्क पर किताब बैठो, फिर दुकान से फ़ाइल ले जाओ। Down नीचा रहता है। Burst चार माँगता है। Catch दोनों ओर ढकता है। Snake खाना गिनता है। Aim झटका बंद करता है। Lane पके निशान का इंतज़ार करता है। Break दीवार साफ़ करता है।",
    "मुफ़्त फ़ाइल उतरती है। कीमत वाली फ़ाइल को सोना चाहिए। कार्ड असली देख दिखाता है। फ़ाइल वही किताब है।",
    "कीमत वाली किताब के लिए जो सोना जुड़ा, वह उसी बैठक पर रहता है। USDT कीमत वाली फ़ाइल खरीदता है, बोनस नहीं।",
    "प्रोफ़ाइल टेक, रंग और अपनी किताबें दिखाती है। शेष तिजोरी पर रहता है।",
    "एक पत्र पत्र ही रहता है।",
    "नौकरियाँ घर की डेस्क पर रहती हैं। मुफ़्त पढ़ो। खाते से आवेदन करो।",
    "आख़िरी टेक अपनी जाँच एक कदम में खोलता है।",
    "गेम, AI, खेल और दाँव — वही घर।",
    {
      Classic: "Classic",
      "The hour": "घंटा",
      Games: "खेल",
      "The store": "दुकान",
      "The vault": "तिजोरी",
      "A seat": "एक सीट",
      Letters: "पत्र",
      Jobs: "नौकरियाँ",
      Fairness: "जाँच",
      "The house": "घर",
    },
  ),
};

const ar: Tongue = {
  doors: ["اجلس على لون", "اجلس على كتاب", "التقِ بمقعد", "اقرأ البيت"],
  lines: ["Classic يمسك القدر.", "شاهد جلسة ثم خذ الملف.", "شخص، أو حرفة، أو مجرد وجود.", "البيت يكتب عن أبواب موجودة."],
  seats: {
    game: { label: "مطوّر ألعاب", who: "يُخرج لعبة أو أداة.", tag: "لعبة" },
    ai: { label: "مطوّر AI", who: "يدرّب نموذجًا.", tag: "AI" },
    gamer: { label: "لاعب", who: "يلعب الألعاب.", tag: "لعب" },
    better: { label: "مقامر", who: "يجلس إلى الطاولات.", tag: "طاولة" },
    here: { label: "هنا", who: "مقعد. بلا حرفة.", tag: "هنا" },
  },
  seatTitle: "حرفة، أو مجرد وجود.",
  seatLead: "اللعبة وAI واللعب والطاولة تبقى. يمكنك الجلوس بلا حرفة.",
  store: "الملف المجاني يُنزَّل. الملف المسعّر يحتاج ذهبًا.",
  pot: "القدر يبقى على Classic.",
  day: day(
    "السعر واحد لكل لون. اللون الأكبر يأخذ الباقي. القدر يبقى على Classic.",
    "الساعة تسمّي الساعة. Night وFog يغيّران الطاولة فقط وهما يعملان.",
    "اجلس على كتاب في المكتب ثم خذ الملف من المتجر. Down يبقى منخفضًا. Burst يطلب أربعة. Catch يغطي الجانبين. Snake يعدّ الطعام. Aim يغلق الحركة. Lane ينتظر العلامة الناضجة. Break يفرغ الجدار.",
    "الملف المجاني يُنزَّل. الملف المسعّر يحتاج ذهبًا. البطاقة تُظهر المشاهدة. الملف هو ذلك الكتاب.",
    "الذهب المضاف لكتاب مسعّر يبقى على تلك الجلسة. USDT يشتري ملفًا مسعّرًا، لا مكافأة.",
    "الملف الشخصي يُظهر الأخذ والألوان والكتب المملوكة. الرصيد يبقى في الخزنة.",
    "الرسالة تبقى رسالة.",
    "الوظائف تبقى على مكتب البيت. القراءة مجانية. التقديم من حساب.",
    "آخر أخذ يفتح فحوصه في خطوة واحدة.",
    "لعبة وAI ولعب ومراهنة — البيت نفسه.",
    {
      Classic: "Classic",
      "The hour": "الساعة",
      Games: "ألعاب",
      "The store": "المتجر",
      "The vault": "الخزنة",
      "A seat": "مقعد",
      Letters: "رسائل",
      Jobs: "وظائف",
      Fairness: "فحص",
      "The house": "البيت",
    },
  ),
};

const pt: Tongue = {
  doors: ["Senta numa cor", "Senta num livro", "Conhece um lugar", "Lê a casa"],
  lines: ["Classic guarda o pote.", "Vê uma sentada e leva o arquivo.", "Uma pessoa, um ofício, ou só aqui.", "A casa escreve sobre portas que existem."],
  seats: {
    game: { label: "Desenvolvedor de jogos", who: "Entrega um jogo ou uma ferramenta.", tag: "Jogo" },
    ai: { label: "Desenvolvedor de IA", who: "Treina um modelo.", tag: "IA" },
    gamer: { label: "Jogador", who: "Joga os jogos.", tag: "Jogar" },
    better: { label: "Apostador", who: "Senta nas mesas.", tag: "Mesa" },
    here: { label: "Aqui", who: "Um lugar. Sem ofício.", tag: "Aqui" },
  },
  seatTitle: "Um ofício, ou só aqui.",
  seatLead: "Jogo, IA, jogar e a mesa ficam. Também podes sentar sem ofício.",
  store: "Um arquivo grátis baixa. Um arquivo com preço precisa de ouro.",
  pot: "O pote fica no Classic.",
  day: day(
    "O mesmo preço em cada cor. A maior cor leva o resto. O pote fica no Classic.",
    "O relógio nomeia a hora. Night e Fog mudam a mesa só enquanto estão ligados.",
    "Senta um livro na mesa e leva o arquivo da loja. Down fica baixo. Burst pede um quatro. Catch cobre os dois lados. Snake conta a comida. Aim fecha o gesto. Lane espera a marca madura. Break limpa a parede.",
    "Um arquivo grátis baixa. Um arquivo com preço precisa de ouro. O cartão mostra o olhar. O arquivo é esse livro.",
    "O ouro posto num livro com preço fica nessa sentada. USDT compra um arquivo com preço, não um bónus.",
    "Um perfil mostra tomadas, tons e livros próprios. O saldo fica no cofre.",
    "Uma carta continua uma carta.",
    "Os empregos ficam na mesa da casa. Lê de graça. Candidata-te com uma conta.",
    "A última tomada abre as verificações num passo.",
    "Jogo, IA, jogar e apostas — a mesma casa.",
    {
      Classic: "Classic",
      "The hour": "A hora",
      Games: "Jogos",
      "The store": "A loja",
      "The vault": "O cofre",
      "A seat": "Um lugar",
      Letters: "Cartas",
      Jobs: "Emprego",
      Fairness: "Verificação",
      "The house": "A casa",
    },
  ),
};

const ru: Tongue = {
  doors: ["Сесть на цвет", "Сесть на книгу", "Встретить место", "Читать дом"],
  lines: ["Classic держит банк.", "Посмотри посадку и забери файл.", "Человек, ремесло или просто здесь.", "Дом пишет о дверях, которые есть."],
  seats: {
    game: { label: "Разработчик игр", who: "Делает игру или инструмент.", tag: "Игра" },
    ai: { label: "Разработчик AI", who: "Учит модель.", tag: "AI" },
    gamer: { label: "Игрок", who: "Играет в игры.", tag: "Играть" },
    better: { label: "Игрок стола", who: "Сидит за столами.", tag: "Стол" },
    here: { label: "Здесь", who: "Место. Ремесло не нужно.", tag: "Здесь" },
  },
  seatTitle: "Ремесло или просто здесь.",
  seatLead: "Игра, AI, игра и стол остаются. Можно сесть без ремесла.",
  store: "Бесплатный файл скачивается. Платный файл требует золота.",
  pot: "Банк остаётся на Classic.",
  day: day(
    "Одна цена на каждый цвет. Самый большой цвет забирает остальное. Банк остаётся на Classic.",
    "Часы называют час. Night и Fog меняют стол только пока они идут.",
    "Сядь на книгу за столом и забери файл из лавки. Down держит низ. Burst берёт четвёрку. Catch закрывает обе стороны. Snake считает еду. Aim закрывает взмах. Lane ждёт спелую метку. Break снимает стену.",
    "Бесплатный файл скачивается. Платный файл требует золота. Карточка показывает просмотр. Файл — это та книга.",
    "Золото за платную книгу остаётся на этой посадке. USDT покупает платный файл, не бонус.",
    "Профиль показывает взятия, тона и свои книги. Баланс остаётся в хранилище.",
    "Письмо остаётся письмом.",
    "Работа остаётся на столе дома. Читать бесплатно. Отклик из аккаунта.",
    "Последнее взятие открывает проверку в один шаг.",
    "Игра, AI, игра и ставки — один дом.",
    {
      Classic: "Classic",
      "The hour": "Час",
      Games: "Игры",
      "The store": "Лавка",
      "The vault": "Хранилище",
      "A seat": "Место",
      Letters: "Письма",
      Jobs: "Работа",
      Fairness: "Проверка",
      "The house": "Дом",
    },
  ),
};

const ja: Tongue = {
  doors: ["色に座る", "本に座る", "席に会う", "家を読む"],
  lines: ["Classic がポットを持つ。", "一度座を見て、ファイルを持ち帰る。", "人、技、またはただここに。", "家はすでにある扉について書く。"],
  seats: {
    game: { label: "ゲーム開発者", who: "ゲームか道具を出す。", tag: "ゲーム" },
    ai: { label: "AI 開発者", who: "モデルを鍛える。", tag: "AI" },
    gamer: { label: "プレイヤー", who: "ゲームで遊ぶ。", tag: "遊ぶ" },
    better: { label: "卓の人", who: "卓に座る。", tag: "卓" },
    here: { label: "ここ", who: "席。技は要らない。", tag: "ここ" },
  },
  seatTitle: "技か、ただここ。",
  seatLead: "ゲーム、AI、遊び、卓はそのまま。技なしでも座れる。",
  store: "無料のファイルは降りる。値のあるファイルには金が要る。",
  pot: "ポットは Classic に残る。",
  day: day(
    "どの色も同じ値段。いちばん大きい色が残りを取る。ポットは Classic に残る。",
    "時計がその時間を名乗る。Night と Fog は開いている間だけ卓を変える。",
    "机の本に座り、店からファイルを持ち帰る。Down は低く。Burst は四つを取る。Catch は両側を覆う。Snake は餌を数える。Aim は一振りを閉じる。Lane は熟した印を待つ。Break は壁を崩す。",
    "無料のファイルは降りる。値のあるファイルには金が要る。カードは見た点を示す。ファイルはその本だ。",
    "値のある本に足した金は、その座に残る。USDT は値のあるファイルを買う。ボーナスではない。",
    "プロフィールはテイク、色、持っている本を示す。残高は金庫に残る。",
    "手紙は手紙のまま。",
    "仕事は家の机に残る。無料で読む。口座から応募する。",
    "最後のテイクは、確認を一歩で開く。",
    "ゲーム、AI、遊び、賭け — 同じ家。",
    {
      Classic: "Classic",
      "The hour": "その時間",
      Games: "ゲーム",
      "The store": "店",
      "The vault": "金庫",
      "A seat": "席",
      Letters: "手紙",
      Jobs: "仕事",
      Fairness: "確認",
      "The house": "家",
    },
  ),
};

const fr: Tongue = {
  doors: ["S’asseoir sur une couleur", "S’asseoir sur un livre", "Rencontrer un siège", "Lire la maison"],
  lines: ["Classic garde le pot.", "Regarde une assise, puis emporte le fichier.", "Une personne, un métier, ou juste ici.", "La maison écrit sur des portes qui existent."],
  seats: {
    game: { label: "Développeur de jeux", who: "Livre un jeu ou un outil.", tag: "Jeu" },
    ai: { label: "Développeur IA", who: "Entraîne un modèle.", tag: "IA" },
    gamer: { label: "Joueur", who: "Joue aux jeux.", tag: "Jouer" },
    better: { label: "Parieur", who: "S’assoit aux tables.", tag: "Table" },
    here: { label: "Ici", who: "Un siège. Pas de métier.", tag: "Ici" },
  },
  seatTitle: "Un métier, ou juste ici.",
  seatLead: "Jeu, IA, jouer et la table restent. On peut aussi s’asseoir sans métier.",
  store: "Un fichier gratuit se télécharge. Un fichier à prix demande de l’or.",
  pot: "Le pot reste sur Classic.",
  day: day(
    "Même prix sur chaque couleur. La plus grande couleur prend le reste. Le pot reste sur Classic.",
    "L’horloge nomme l’heure. Night et Fog ne changent la table que pendant qu’ils sont ouverts.",
    "Assieds un livre au bureau, puis prends le fichier à la boutique. Down reste bas. Burst prend un quatre. Catch couvre les deux côtés. Snake compte la nourriture. Aim ferme le geste. Lane attend la marque mûre. Break vide le mur.",
    "Un fichier gratuit se télécharge. Un fichier à prix demande de l’or. La carte montre la veille. Le fichier est ce livre.",
    "L’or ajouté pour un livre à prix reste sur cette assise. L’USDT achète un fichier à prix, pas un bonus.",
    "Un profil montre les prises, les teintes et les livres possédés. Le solde reste au coffre.",
    "Une lettre reste une lettre.",
    "Les emplois restent au bureau de la maison. Lecture gratuite. Postule depuis un compte.",
    "La dernière prise ouvre ses vérifications en une étape.",
    "Jeu, IA, jouer et paris — la même maison.",
    {
      Classic: "Classic",
      "The hour": "L’heure",
      Games: "Jeux",
      "The store": "La boutique",
      "The vault": "Le coffre",
      "A seat": "Un siège",
      Letters: "Lettres",
      Jobs: "Emplois",
      Fairness: "Vérification",
      "The house": "La maison",
    },
  ),
};

const de: Tongue = {
  doors: ["Auf eine Farbe setzen", "Auf ein Buch setzen", "Einen Sitz treffen", "Das Haus lesen"],
  lines: ["Classic hält den Topf.", "Sieh ein Sitzen, dann nimm die Datei.", "Eine Person, ein Handwerk, oder einfach hier.", "Das Haus schreibt über Türen, die es gibt."],
  seats: {
    game: { label: "Spieleentwickler", who: "Liefert ein Spiel oder ein Werkzeug.", tag: "Spiel" },
    ai: { label: "KI-Entwickler", who: "Trainiert ein Modell.", tag: "KI" },
    gamer: { label: "Spieler", who: "Spielt die Spiele.", tag: "Spiel" },
    better: { label: "Setzer", who: "Sitzt an den Tischen.", tag: "Tisch" },
    here: { label: "Hier", who: "Ein Sitz. Kein Handwerk nötig.", tag: "Hier" },
  },
  seatTitle: "Ein Handwerk, oder einfach hier.",
  seatLead: "Spiel, KI, Spielen und der Tisch bleiben. Du kannst auch ohne Handwerk sitzen.",
  store: "Eine freie Datei lädt herunter. Eine Datei mit Preis braucht Gold.",
  pot: "Der Topf bleibt auf Classic.",
  day: day(
    "Gleicher Preis auf jeder Farbe. Die größte Farbe nimmt den Rest. Der Topf bleibt auf Classic.",
    "Die Uhr nennt die Stunde. Night und Fog ändern den Tisch nur, solange sie an sind.",
    "Setz ein Buch an den Tisch und nimm die Datei aus dem Laden. Down bleibt niedrig. Burst nimmt eine Vier. Catch deckt beide Seiten. Snake zählt das Futter. Aim schließt den Schwung. Lane wartet auf die reife Marke. Break räumt die Wand.",
    "Eine freie Datei lädt herunter. Eine Datei mit Preis braucht Gold. Die Karte zeigt die Wache. Die Datei ist das Buch.",
    "Gold für ein Buch mit Preis bleibt auf diesem Sitzen. USDT kauft eine Datei mit Preis, keinen Bonus.",
    "Ein Profil zeigt Takes, Töne und eigene Bücher. Der Stand bleibt im Tresor.",
    "Ein Brief bleibt ein Brief.",
    "Arbeit bleibt am Tisch des Hauses. Lesen ist frei. Bewirb dich aus einem Konto.",
    "Der letzte Take öffnet seine Prüfung in einem Schritt.",
    "Spiel, KI, Spielen und Wetten — dasselbe Haus.",
    {
      Classic: "Classic",
      "The hour": "Die Stunde",
      Games: "Spiele",
      "The store": "Der Laden",
      "The vault": "Der Tresor",
      "A seat": "Ein Sitz",
      Letters: "Briefe",
      Jobs: "Arbeit",
      Fairness: "Prüfung",
      "The house": "Das Haus",
    },
  ),
};

const ko: Tongue = {
  doors: ["색에 앉기", "책에 앉기", "자리 만나기", "집을 읽기"],
  lines: ["Classic 이 팟을 지킨다.", "한 자리를 보고 파일을 가져간다.", "사람, 솜씨, 또는 그냥 여기.", "집은 있는 문에 대해서만 쓴다."],
  seats: {
    game: { label: "게임 개발자", who: "게임이나 도구를 낸다.", tag: "게임" },
    ai: { label: "AI 개발자", who: "모델을 훈련한다.", tag: "AI" },
    gamer: { label: "플레이어", who: "게임을 한다.", tag: "놀이" },
    better: { label: "테이블의 사람", who: "테이블에 앉는다.", tag: "테이블" },
    here: { label: "여기", who: "자리. 솜씨는 필요 없다.", tag: "여기" },
  },
  seatTitle: "솜씨, 또는 그냥 여기.",
  seatLead: "게임, AI, 놀이, 테이블은 남는다. 솜씨 없이도 앉을 수 있다.",
  store: "무료 파일은 내려받는다. 값 있는 파일은 금이 필요하다.",
  pot: "팟은 Classic 에 남는다.",
  day: day(
    "모든 색은 같은 값. 가장 큰 색이 나머지를 가져간다. 팟은 Classic 에 남는다.",
    "시계가 그 시간을 말한다. Night 와 Fog 는 켜져 있는 동안만 테이블을 바꾼다.",
    "책상에 책을 앉히고 가게에서 파일을 가져간다. Down 은 낮게. Burst 는 넷을 가져간다. Catch 는 양쪽을 덮는다. Snake 는 먹이를 센다. Aim 은 한 획을 닫는다. Lane 은 익은 표를 기다린다. Break 는 벽을 비운다.",
    "무료 파일은 내려받는다. 값 있는 파일은 금이 필요하다. 카드는 본 점수를 보여 준다. 파일이 그 책이다.",
    "값 있는 책에 더한 금은 그 자리에 남는다. USDT 는 값 있는 파일을 산다. 보너스가 아니다.",
    "프로필은 테이크, 색, 가진 책을 보여 준다. 잔액은 금고에 남는다.",
    "편지는 편지로 남는다.",
    "일은 집의 책상에 남는다. 공짜로 읽는다. 계정에서 지원한다.",
    "마지막 테이크는 확인을 한 걸음에 연다.",
    "게임, AI, 놀이, 베팅 — 같은 집.",
    {
      Classic: "Classic",
      "The hour": "그 시간",
      Games: "게임",
      "The store": "가게",
      "The vault": "금고",
      "A seat": "자리",
      Letters: "편지",
      Jobs: "일",
      Fairness: "확인",
      "The house": "집",
    },
  ),
};

const idn: Tongue = {
  doors: ["Duduk di warna", "Duduk di buku", "Temui tempat duduk", "Baca rumah"],
  lines: ["Classic memegang pot.", "Lihat satu duduk, lalu bawa berkasnya.", "Seseorang, satu keahlian, atau hanya di sini.", "Rumah menulis tentang pintu yang ada."],
  seats: {
    game: { label: "Pengembang game", who: "Mengeluarkan game atau alat.", tag: "Game" },
    ai: { label: "Pengembang AI", who: "Melatih model.", tag: "AI" },
    gamer: { label: "Pemain", who: "Memainkan game.", tag: "Main" },
    better: { label: "Pemain meja", who: "Duduk di meja.", tag: "Meja" },
    here: { label: "Di sini", who: "Satu tempat. Tanpa keahlian.", tag: "Di sini" },
  },
  seatTitle: "Satu keahlian, atau hanya di sini.",
  seatLead: "Game, AI, main, dan meja tetap. Kamu juga bisa duduk tanpa keahlian.",
  store: "Berkas gratis terunduh. Berkas berharga butuh emas.",
  pot: "Pot tetap di Classic.",
  day: day(
    "Harga sama di setiap warna. Warna terbesar mengambil sisanya. Pot tetap di Classic.",
    "Jam menyebut jam itu. Night dan Fog mengubah meja hanya selagi menyala.",
    "Duduk di buku pada meja, lalu ambil berkas dari toko. Down tetap rendah. Burst mengambil empat. Catch menutup kedua sisi. Snake menghitung makanan. Aim menutup satu kibasan. Lane menunggu tanda yang matang. Break membersihkan dinding.",
    "Berkas gratis terunduh. Berkas berharga butuh emas. Kartu menunjukkan tontonan. Berkas itu buku itu.",
    "Emas untuk buku berharga tetap di duduk itu. USDT membeli berkas berharga, bukan bonus.",
    "Profil menunjukkan ambilan, rona, dan buku yang dimiliki. Saldo tetap di brankas.",
    "Surat tetap surat.",
    "Pekerjaan tetap di meja rumah. Baca gratis. Lamar dari akun.",
    "Ambilan terakhir membuka pemeriksaannya dalam satu langkah.",
    "Game, AI, main, dan taruhan — rumah yang sama.",
    {
      Classic: "Classic",
      "The hour": "Jam itu",
      Games: "Game",
      "The store": "Toko",
      "The vault": "Brankas",
      "A seat": "Tempat duduk",
      Letters: "Surat",
      Jobs: "Pekerjaan",
      Fairness: "Pemeriksaan",
      "The house": "Rumah",
    },
  ),
};

const TONGUE: Record<LocaleId, Tongue> = {
  en,
  es,
  zh,
  hi,
  ar,
  pt,
  ru,
  ja,
  fr,
  de,
  ko,
  id: idn,
};

function tongueOf(locale: LocaleId) {
  return TONGUE[locale] ?? TONGUE[DEFAULT_LOCALE];
}

export function spokenDoors(locale: LocaleId): HallDoor[] {
  const tongue = tongueOf(locale);
  return hallDoors().map((door, index) => ({
    ...door,
    title: tongue.doors[index] ?? door.title,
    line: tongue.lines[index] ?? door.line,
  }));
}

export function spokenSeat(locale: LocaleId, id: HouseSeatId): SeatFace {
  return tongueOf(locale).seats[id];
}

export function seatTitle(locale: LocaleId) {
  return tongueOf(locale).seatTitle;
}

export function seatLead(locale: LocaleId) {
  return tongueOf(locale).seatLead;
}

export function storeSentence(locale: LocaleId) {
  return tongueOf(locale).store;
}

/** The pot rule, in that language. Classic keeps its name. */
export function potLine(locale: LocaleId) {
  return tongueOf(locale).pot;
}

export function spokenDay(locale: LocaleId, englishTitle: string) {
  if (!DAY_KEYS.includes(englishTitle as DayKey)) return null;
  return tongueOf(locale).day[englishTitle as DayKey];
}

export function seatFaces(locale: LocaleId) {
  return HOUSE_SEATS.map((row) => ({ ...row, ...spokenSeat(locale, row.id) }));
}
