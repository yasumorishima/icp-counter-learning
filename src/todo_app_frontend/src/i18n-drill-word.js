/**
 * 文章題（ぶんしょうだい）の 文言。単元の 名まえと、問題文の ひな型。
 *
 * 計算の 単元（i18n-drill.js）と 分けて あるのは、文章が 長く、
 * ことばの えらび方が 計算とは 別の しごとに なるから。
 *
 * ひな型の きまり:
 *   - {0} {1} … は drill-word.js が わたす 順ばん。
 *   - 使う 置きかえは ことばごとに ちがって よい（日本語だけが 助数詞 を 使う）。
 *   - 名まえ・もの・しなものの 一覧は「,」で 区切った 1 本の 文字列。
 *     もの は「なまえ/助数詞」で、英語がわの 助数詞は 空に して おく。
 *   - 数は どちらの ことばでも 同じ ものを 使う（答えは コードが 出す）。
 *     お金は 日本語が「円」、英語が「cents」。どちらも そのまま 読める 大きさに そろえる。
 */

export const drillWordEn = {
  // --- 一覧（名まえ・もの・しなもの）----------------------------------------
  dr_wNames: "Liam,Grace,Owen,Ivy,Noah,Mia,Leo,Ella",
  dr_wItems: "apples/,stickers/,marbles/,cookies/,shells/,acorns/",
  dr_wGoods: "pencil,eraser,sticker,notebook,candy",
  dr_wBigGoods: "T-shirt,book,ball,cake,bag",

  // --- まちがえた ときに 出す「どう とくか」--------------------------------
  // 式そのものは コードが 組み立てる（数字と ＋−×÷ は ことばに よらない）。
  // ここに 置くのは その まわりの ことばだけ。
  dr_why: "How to work it out:   {0}",
  dr_whyRule: "The rule is +{0} each time.   {1} + {0}",
  dr_whyRuleDouble: "The rule is doubling.   {0} × 2",
  dr_whyRemainder: "{0} ÷ {1} = {2} remainder {3}",
  dr_whyBoxes: "{0} ÷ {1} = {2} remainder {3}. The ones left over need a box too, so {4}",

  // --- 1年 -------------------------------------------------------------------
  dr_wu1Add: "How many altogether",
  dr_wu1Sub: "How many are left",
  dr_wu1Diff: "Who has more",
  dr_wu1Missing: "How many at the start",
  dr_wu1Pattern: "The rule of a number line",

  dr_w1Add: "{0} has {2} {1}. Then {0} gets {4} more. How many {1} are there now?",
  dr_w1Sub: "{0} has {2} {1}. {0} gives {4} of them away. How many {1} are left?",
  dr_w1Diff: "{0} has {1} {5}. {2} has {3} {5}. How many more does {0} have?",
  dr_w1Missing: "{0} had some {1}. After getting {2} more, {0} has {3}. How many {1} did {0} have at the start?",
  dr_w1Pattern: "The same number is added each time. What comes next?   {0}",

  // --- 2年 -------------------------------------------------------------------
  dr_wu2Pattern: "Find the rule",
  dr_wu2Add: "Two-digit adding stories",
  dr_wu2Sub: "Two-digit taking-away stories",
  dr_wu2Mul: "Groups of the same size",
  dr_wu2Money: "Money stories",
  dr_wu2Len: "Length stories",

  dr_w2Pat1: "{0} does push-ups. {0} does {1} on Monday, {2} on Tuesday and {3} on Wednesday. If {0} keeps this pattern, how many push-ups does {0} do on Thursday?",
  dr_w2Pat2: "{0} reads a book. {0} reads {1} pages on Monday, {2} pages on Tuesday and {3} pages on Wednesday. If {0} keeps this pattern, how many pages does {0} read on Thursday?",
  dr_w2Pat3: "{0} is saving stickers. {0} saves {1} on Monday, {2} on Tuesday and {3} on Wednesday. If {0} keeps saving with this pattern, how many stickers does {0} save on Thursday?",
  dr_w2Pat4: "{0} walks the dog. {0} walks {1} minutes on Monday, {2} minutes on Tuesday and {3} minutes on Wednesday. If {0} keeps this pattern, how many minutes does {0} walk on Thursday?",
  dr_w2Add: "{0} had {1} {2}. Then {0} got {3} more. How many {2} does {0} have now?",
  dr_w2Sub: "There were {1} {2} in the box. {0} took {3} of them out. How many {2} are still in the box?",
  dr_w2Mul: "There are {1} bags. Each bag holds {2} {3}. How many {3} are there in all?",
  dr_w2Money: "{0} has {1} yen. A {2} costs {3} yen. How many yen will be left?",
  dr_w2Len: "The blue tape is {0} cm long. The red tape is {1} cm shorter than the blue one. How many cm long is the red tape?",

  // --- 3年 -------------------------------------------------------------------
  dr_wu3Div: "Sharing equally",
  dr_wu3Rem: "Leftovers and boxes",
  dr_wu3Mul: "Multiplying stories",
  dr_wu3Change: "Change from your money",
  dr_wu3Pattern: "Find the rule (bigger steps)",

  dr_w3Div: "There are {1} {2}. {3} children share them equally. How many {2} does each child get?",
  dr_w3Rem: "There are {0} {1}. Each box holds {2}. How many {1} are left over when the boxes are full?",
  dr_w3Box: "There are {0} {1}. One box holds {2}. How many boxes are needed to hold them all?",
  dr_w3Mul: "One box holds {1} {2}. How many {2} are in {0} boxes?",
  dr_w3Change: "{0} pays {1} yen for a {2} that costs {3} yen. How many yen of change does {0} get back?",
  dr_w3Pattern: "Find the rule, then work out the number in the box.   {0}",

  // --- 4年 -------------------------------------------------------------------
  dr_wu4Div: "Sharing bigger numbers",
  dr_wu4Times: "How many times as much",
  dr_wu4Dec: "Decimal stories",
  dr_wu4Area: "Area stories",
  dr_wu4Round: "About how many",

  dr_w4Div: "{0} sheets of paper are shared equally among {1} classes. How many sheets does each class get?",
  dr_w4TimesMul: "The red ribbon is {0} cm long. The blue ribbon is {1} times as long as the red one. How many cm long is the blue ribbon?",
  dr_w4TimesDiv: "The blue ribbon is {0} cm long. The red ribbon is {1} cm long. How many times as long as the red one is the blue one?",
  dr_w4Dec: "{0} drank {1} L of water in the morning and {2} L in the afternoon. How many L did {0} drink in all?",
  dr_w4Area: "A garden is {0} m long and {1} m wide. How many m2 is its area?",
  dr_w4Round: "{0} people came to the park on Sunday. About how many people is that, rounded to the nearest hundred?",

  // --- 5年 -------------------------------------------------------------------
  dr_wu5Percent: "Percentage stories",
  dr_wu5Average: "Average stories",
  dr_wu5Rate: "How much for one",
  dr_wu5DecMul: "Multiplying decimal stories",
  dr_wu5Volume: "Volume stories",

  dr_w5Percent: "There are {0} children in the school. {1}％ of them come by bus. How many children come by bus?",
  dr_w5Average: "{0} practised for {1} minutes in {2} days. On average, how many minutes a day is that?",
  dr_w5Rate: "{0} pencils cost {1} yen. How many yen does one pencil cost?",
  dr_w5DecMul: "One metre of ribbon costs {0} yen. How many yen do {1} metres cost?",
  dr_w5Volume: "A tank is {0} cm long, {1} cm wide and {2} cm deep. How many cm3 of water fills it up?",

  // --- 6年 -------------------------------------------------------------------
  dr_wu6Speed: "Speed stories",
  dr_wu6Ratio: "Ratio stories",
  dr_wu6Frac: "Fraction stories",
  dr_wu6Discount: "Sale price stories",
  dr_wu6Cases: "How many different ways",

  dr_w6SpeedRate: "A car travels {0} km in {1} hours. How many km does it travel in one hour?",
  dr_w6SpeedDist: "A car travels {0} km in one hour. How many km does it travel in {1} hours?",
  dr_w6Ratio: "Juice and water are mixed in the ratio {0} : {1}. There is {2} mL of juice. How many mL of water is there?",
  dr_w6Frac: "A ribbon is {0} m long. {1} m of it is used. How many m are left? Write the answer as a fraction.",
  dr_w6Discount: "A {0} costs {1} yen. Today it is {2}％ off. How many yen does it cost today?",
  dr_w6Cases: "{0} has {1} shirts and {2} hats. How many different ways can {0} wear one shirt and one hat?",
};

export const drillWordJa = {
  // --- 一覧（名まえ・もの・しなもの）----------------------------------------
  dr_wNames: "はると,ゆい,そうた,みお,りく,さな,かいと,あおい",
  dr_wItems: "りんご/こ,シール/まい,ビーだま/こ,クッキー/まい,かいがら/こ,どんぐり/こ",
  dr_wGoods: "えんぴつ,けしゴム,シール,ノート,あめ",
  dr_wBigGoods: "Tシャツ,本,ボール,ケーキ,かばん",

  // --- まちがえた ときに 出す「どう とくか」--------------------------------
  dr_why: "こう とくよ　　{0}",
  dr_whyRule: "きまりは {0}ずつ ふえる。　{1} + {0}",
  dr_whyRuleDouble: "きまりは 2ばいずつ。　{0} × 2",
  dr_whyRemainder: "{0} ÷ {1} = {2} あまり {3}",
  dr_whyBoxes: "{0} ÷ {1} = {2} あまり {3}。あまりにも はこが いるので {4}",

  // --- 1年 -------------------------------------------------------------------
  dr_wu1Add: "あわせて いくつ",
  dr_wu1Sub: "のこりは いくつ",
  dr_wu1Diff: "どちらが おおい",
  dr_wu1Missing: "はじめは いくつ",
  dr_wu1Pattern: "かずの ならびの きまり",

  dr_w1Add: "{0}さんは {1}を {2}{3} もって います。{4}{3} もらいました。ぜんぶで なん{3} ですか。",
  dr_w1Sub: "{0}さんは {1}を {2}{3} もって います。{4}{3} あげました。のこりは なん{3} ですか。",
  dr_w1Diff: "{0}さんは {5}を {1}{4} もって います。{2}さんは {3}{4} です。{0}さんは {2}さんより なん{4} おおい ですか。",
  dr_w1Missing: "{0}さんは {1}を いくつか もって いました。{2}{4} もらったので、ぜんぶで {3}{4} に なりました。はじめは なん{4} ありましたか。",
  dr_w1Pattern: "おなじ かずずつ ふえて います。つぎは なん ですか。   {0}",

  // --- 2年 -------------------------------------------------------------------
  dr_wu2Pattern: "きまりを みつける",
  dr_wu2Add: "2けたの たしざんの おはなし",
  dr_wu2Sub: "2けたの ひきざんの おはなし",
  dr_wu2Mul: "おなじ かずずつの まとまり",
  dr_wu2Money: "おかねの おはなし",
  dr_wu2Len: "ながさの おはなし",

  dr_w2Pat1: "{0}さんは うでたてふせを します。月よう日に {1}回、火よう日に {2}回、水よう日に {3}回 しました。この きまりで つづけると、木よう日は なん回 ですか。",
  dr_w2Pat2: "{0}さんは 本を よんで います。月よう日に {1}ページ、火よう日に {2}ページ、水よう日に {3}ページ よみました。この きまりで つづけると、木よう日は なんページ ですか。",
  dr_w2Pat3: "{0}さんは シールを あつめて います。月よう日に {1}まい、火よう日に {2}まい、水よう日に {3}まい あつめました。この きまりで つづけると、木よう日は なんまい ですか。",
  dr_w2Pat4: "{0}さんは 犬の さんぽを します。月よう日に {1}分、火よう日に {2}分、水よう日に {3}分 あるきました。この きまりで つづけると、木よう日は なん分 ですか。",
  dr_w2Add: "{0}さんは {2}を {1}{4} もって いました。あとから {3}{4} ふえました。いま なん{4} ありますか。",
  dr_w2Sub: "はこの 中に {2}が {1}{4} ありました。{0}さんが {3}{4} とりだしました。はこの 中は なん{4} ですか。",
  dr_w2Mul: "ふくろが {1}まい あります。1まいに {3}が {2}{4} ずつ 入って います。ぜんぶで なん{4} ですか。",
  dr_w2Money: "{0}さんは {1}円 もって います。{2}は {3}円 です。のこりは なん円 ですか。",
  dr_w2Len: "あおい テープは {0}cm です。あかい テープは あおい テープより {1}cm みじかい です。あかい テープは なんcm ですか。",

  // --- 3年 -------------------------------------------------------------------
  dr_wu3Div: "同じ数ずつ 分ける",
  dr_wu3Rem: "あまりと はこの おはなし",
  dr_wu3Mul: "かけざんの おはなし",
  dr_wu3Change: "おつりの おはなし",
  dr_wu3Pattern: "きまりを みつける（大きい きざみ）",

  dr_w3Div: "{2}が {1}{4} あります。{3}人で 同じ数ずつ 分けます。1人ぶんは なん{4} ですか。",
  dr_w3Rem: "{1}が {0}{3} あります。1はこに {2}{3} ずつ 入れます。はこに 入りきらないのは なん{3} ですか。",
  dr_w3Box: "{1}が {0}{3} あります。1はこに {2}{3} ずつ 入れます。ぜんぶ 入れるには はこは なんこ いりますか。",
  dr_w3Mul: "1はこに {2}が {1}{3} 入って います。{0}はこでは なん{3} ですか。",
  dr_w3Change: "{0}さんは {3}円の {2}を 買うのに {1}円 はらいました。おつりは なん円 ですか。",
  dr_w3Pattern: "きまりを みつけて、□に 入る かずを もとめましょう。   {0}",

  // --- 4年 -------------------------------------------------------------------
  dr_wu4Div: "大きい かずを 分ける",
  dr_wu4Times: "なんばいの おはなし",
  dr_wu4Dec: "小数の おはなし",
  dr_wu4Area: "面積の おはなし",
  dr_wu4Round: "およその かずの おはなし",

  dr_w4Div: "紙が {0}まい あります。{1}クラスで 同じ数ずつ 分けると、1クラスぶんは なんまい ですか。",
  dr_w4TimesMul: "あかい リボンは {0}cm です。あおい リボンは あかい リボンの {1}ばいの 長さです。あおい リボンは なんcm ですか。",
  dr_w4TimesDiv: "あおい リボンは {0}cm、あかい リボンは {1}cm です。あおい リボンは あかい リボンの なんばい ですか。",
  dr_w4Dec: "{0}さんは 水を 朝に {1}L、ひるから {2}L のみました。あわせて なんL ですか。",
  dr_w4Area: "たて {0}m、よこ {1}m の 花だんが あります。面積は なん m2 ですか。",
  dr_w4Round: "日よう日に 公園へ {0}人 来ました。十のくらいを 四捨五入すると、およそ なん人 ですか。",

  // --- 5年 -------------------------------------------------------------------
  dr_wu5Percent: "わりあいの おはなし",
  dr_wu5Average: "へいきんの おはなし",
  dr_wu5Rate: "1こぶんの おはなし",
  dr_wu5DecMul: "小数の かけ算の おはなし",
  dr_wu5Volume: "体積の おはなし",

  dr_w5Percent: "学校に 子どもが {0}人 います。そのうちの {1}％ が バスで 来ます。バスで 来るのは なん人 ですか。",
  dr_w5Average: "{0}さんは {2}日間で {1}分 れんしゅうしました。1日 へいきんで なん分 ですか。",
  dr_w5Rate: "えんぴつ {0}本で {1}円 です。1本では なん円 ですか。",
  dr_w5DecMul: "リボン 1m の ねだんは {0}円 です。{1}m 買うと なん円 ですか。",
  dr_w5Volume: "たて {0}cm、よこ {1}cm、ふかさ {2}cm の 水そうが あります。いっぱいに 入る 水は なん cm3 ですか。",

  // --- 6年 -------------------------------------------------------------------
  dr_wu6Speed: "速さの おはなし",
  dr_wu6Ratio: "比の おはなし",
  dr_wu6Frac: "分数の おはなし",
  dr_wu6Discount: "わりびきの おはなし",
  dr_wu6Cases: "組み合わせの おはなし",

  dr_w6SpeedRate: "車が {1}時間で {0}km 走りました。1時間に なんkm 走る 速さ ですか。",
  dr_w6SpeedDist: "1時間に {0}km 走る 車が あります。{1}時間では なんkm 走りますか。",
  dr_w6Ratio: "ジュースと 水を {0} : {1} の 比で まぜます。ジュースが {2}mL の とき、水は なんmL ですか。",
  dr_w6Frac: "リボンが {0}m あります。{1}m つかいました。のこりは なんm ですか。分数で 答えましょう。",
  dr_w6Discount: "{0}は {1}円 です。きょうは {2}％ びき です。きょうの ねだんは なん円 ですか。",
  dr_w6Cases: "{0}さんは シャツを {1}まい、ぼうしを {2}こ もって います。シャツと ぼうしの 組み合わせは なん通り ですか。",
};
