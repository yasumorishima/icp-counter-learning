/**
 * index.html に 直接 書いてある 文言（画面の骨組み）。
 * 動く部分の 文言は i18n-drill / i18n-shogi / i18n-sky にある。
 *
 * 日本語は こども向けなので、ひらがな 中心の やさしい 言い方に そろえる。
 * 英語も 同じ ねらいで、みじかく やさしい 語を えらぶ。
 */

export const coreEn = {
  // --- サイト全体 ---
  c_siteName: "Math, Shogi & Sky",
  c_metaDesc:
    "Math drills for grades 1-6, shogi you can play on your own, and the real night sky for any place and time. No ads, no sign-up. Your records stay on your device.",
  c_ogDesc: "No ads, no sign-up. Your records stay on your device.",

  // --- ヘッダー ---
  c_sound: "Sound",
  c_textSize: "Text size",
  c_sizeMark: "A",
  c_theme: "Light or dark",
  c_language: "Language",

  // --- トップ（えらぶ） ---
  c_pickTitle: "What shall we do?",
  c_pickLede: "No ads. Your records stay on this device only.",
  c_pickDrill: "Math drills",
  c_pickDrillNote: "Grades 1-6 · 36 topics",
  c_pickShogi: "Shogi",
  c_pickShogiNote: "Play against the computer",
  c_pickSky: "Sky",
  c_pickSkyNote: "The real sky, right now",
  c_pickAsobi: "Play",
  c_pickAsobiNote: "For little ones, from age 3",
  c_go: "Start",
  c_look: "Look",

  // --- しょうぎ（はじめる画面） ---
  c_shogiTitle: "Shogi",
  c_shogiLede: "Pick how strong your opponent is and which side you play.",
  c_shogiStrength: "How strong",
  c_shogiSide: "Which side are you",
  c_shogiStart: "Start",
  c_shogiResume: "Carry on from last time",
  c_shogiHowTo: "How to play",
  c_shogiHow1Head: "Moving",
  c_shogiHow1:
    "Tap one of your pieces and the squares it can reach light up as green circles. Tap a circle to move there. How the piece you picked moves is shown under the board.",
  c_shogiHow2Head: "Captured pieces come back",
  c_shogiHow2:
    "When you take one of your opponent's pieces it becomes yours. Tap it in your hand, then tap any empty square to drop it there.",
  c_shogiHow3Head: "Promoting",
  c_shogiHow3:
    "A piece that reaches your opponent's camp (the three ranks farthest from you) can become stronger. You are asked \"Promote?\" as it goes in.",
  c_shogiHow4Head: "Things you may not do",
  c_shogiHow4:
    "Two pawns on the same file, dropping a pawn, lance or knight where it could never move again, and dropping a pawn to give checkmate straight away. Those three are simply not offered.",
  c_shogiHow5Head: "Check and winning",
  c_shogiHow5:
    "When your king is attacked (check) you must play a move that saves it. When it can no longer get away, that is checkmate and the game is over.",
  c_shogiHow6Head: "Walking the king across",
  c_shogiHow6:
    "When both kings walk into the opponent's camp, checkmate may stop being possible. Then the game can be ended on points, counting the pieces in the camp and in hand (rook and bishop are 5 points, everything else 1). A button appears under the board only when that is possible (31 points or more wins, from 24 it is a draw).",
  c_shogiHow7Head: "Repeating check",
  c_shogiHow7:
    "If the same position comes up four times the game stops there. Normally it is a draw, but if one side kept giving check the whole time, that side loses.",
  c_shogiHow8Head: "If you get stuck",
  c_shogiHow8: "\"Hint\" shows a good next move. \"Take back\" undoes your move.",
  c_back: "Back",

  // --- しょうぎ（対局中） ---
  c_shogiQuit: "Stop",
  c_shogiFlip: "Turn the board",
  c_shogiHint: "Hint",
  c_shogiUndo: "Take back",
  c_shogiResign: "I resign",
  c_shogiMoves: "Moves so far",
  c_shogiPromoteAsk: "Promote?",
  c_shogiPromoteYes: "Promote",
  c_shogiPromoteNo: "Leave it",
  c_shogiAgain: "Play again",
  c_shogiSeeBoard: "Look at the board",

  // --- さんすう（トップ） ---
  c_whoHello: "Hello",
  c_whoSwitch: "Change who is using this ▼",
  c_records: "Records",
  c_whoNameTitle: "Choose a name",
  c_whoNameLede: "These records stay on this device only.",
  c_whoNamePh: "name",
  c_whoStart: "Start",
  c_dailyLabel: "Today's sheet",
  c_timeLabel: "Time attack",
  c_timeGo: "60 seconds",
  c_levelRank: "Level 1",

  // --- 問題・けっか・しょうじょう ---
  c_quizQuit: "Stop",
  c_resultAgain: "Once more",
  c_resultOther: "Another topic",
  c_awardPrint: "Print it",

  // --- きろく ---
  c_kirokuTitle: "Records",
  c_kirokuLede: "The records are on this device only. Nothing is sent anywhere.",
  c_kirokuMove: "Moving to another device",
  c_kirokuExport: "Save to a file",
  c_kirokuImport: "Read a file",

  // --- そら ---
  c_skyCanvas: "The night sky. Drag to look around. Arrow keys look around, plus and minus zoom, Enter reads what is in the middle.",
  c_skyIn: "Closer",
  c_skyOut: "Further",
  c_skyNow: "Now",
  c_skyShiftLabel: "Move the time up to 12 hours either way",
  c_skyWhen: "Date and time",
  c_skySpeed: "Run the time",
  c_skyWhere: "Where you are looking from",
  c_skyFaceSouth: "Face south",
  c_skyShow: "What to show",
  c_skyLines: "Constellation lines",
  c_skyNames: "Constellation names",
  c_skyMilky: "The Milky Way",
  c_skyAbout: "About this sky",
  c_skyAbout1:
    "Drag the screen to look around. Pinch with two fingers to come closer. Tap a star to see its name and how bright it is.",
  c_skyAbout2:
    "It shows the 8,404 stars you could see with your eyes (down to magnitude 6.5). The colours match the real ones: bluer stars are hotter, redder stars are cooler.",
  c_skyAbout3:
    "Where the Moon, the Sun and the planets are is worked out here, for that exact time. The slow wobble of the Earth since the year 2000 is taken into account too.",
  c_skyAbout4: "It works with no signal. Nothing you look at is sent anywhere.",
  c_skyCredit1: "Star positions come from",
  c_skyCredit2: "(Hoffleit & Warren 1991, V/50 at VizieR/CDS). The constellation lines and names and the shape of the Milky Way come from",
  c_skyCredit3:
    "(Copyright (c) 2015, Olaf Frohn, BSD 3-Clause License). Both are used with the notices their authors asked for kept in place.",
  c_skyCreditLink: "Full notices",

  // --- 支援（このサイトについて） ---
  c_supportMore: "For people who want the details",
  supportNav: "Support",
  supportHeading: "SUPPORT",
  supportIntro:
    "This site has no ads and no sign-up. It costs a little to keep running, and for now the person who made it pays for that.",
  fuelHeading: "How long it can keep running",
  fuelYears: "about {0} years",
  fuelMonths: "about {0} months",
  fuelDetail: "{0} left, using {1} a year",
  fuelUnknown: "cannot check right now",
  supportHow: "How to help",
  supportHow1:
    "Top up the backend canister with cycles. Most top-up services only need the canister ID below.",
  supportHow2: "Or, from a wallet canister:",
  backendIdLabel: "Data canister",
  frontendIdLabel: "Site canister",
  copy: "Copy",
  noIcpNote:
    "Sending ICP straight to the canister does nothing. ICP has to be turned into cycles first.",
  waysHeading: "Where to get cycles",
  wayNns: "NNS — the official app. Turn ICP into cycles and top up any canister ID.",
  wayTopup: "icptopup.com — tops up with just the canister ID.",
  wayCycleops: "CycleOps — keeps a canister topped up automatically.",
  wayDex: "ICPSwap — a DEX, if you need to get ICP first.",
  supportThanks: "Thank you for keeping it running.",
  backHome: "Back",
  counterNote: "This site used to be a counter. It is still here.",
};

export const coreJa = {
  // --- サイト全体 ---
  c_siteName: "さんすう しょうぎ そら",
  c_metaDesc:
    "小学 1〜6年の さんすうドリル、ひとりで あそべる しょうぎ、いまの 星空を そのまま 出す そら。広告なし、登録なし。記録は端末の中だけに残ります。",
  c_ogDesc: "広告なし、登録なし。記録は端末の中だけ。",

  // --- ヘッダー ---
  c_sound: "おと",
  c_textSize: "もじの おおきさ",
  c_sizeMark: "あ",
  c_theme: "あかるさ",
  c_language: "ことば",

  // --- トップ（えらぶ） ---
  c_pickTitle: "なにを する？",
  c_pickLede: "こうこくは ありません。きろくは この たんまつの なかだけに のこります。",
  c_pickDrill: "さんすう ドリル",
  c_pickDrillNote: "1〜6年　36 の たんげん",
  c_pickShogi: "しょうぎ",
  c_pickShogiNote: "ひとりで あいてと たいきょく",
  c_pickSky: "そら",
  c_pickSkyNote: "いまの 星空を そのまま",
  c_pickAsobi: "あそび",
  c_pickAsobiNote: "3さいから ゆびで さわるだけ",
  c_go: "やる",
  c_look: "みる",

  // --- しょうぎ（はじめる画面） ---
  c_shogiTitle: "しょうぎ",
  c_shogiLede: "あいての つよさと、じぶんの てばんを えらんで はじめます。",
  c_shogiStrength: "あいての つよさ",
  c_shogiSide: "じぶんは どっち",
  c_shogiStart: "はじめる",
  c_shogiResume: "まえの つづきから",
  c_shogiHowTo: "あそびかた",
  c_shogiHow1Head: "うごかす",
  c_shogiHow1:
    "じぶんの 駒を おすと、行ける ますが みどりの ○ で 光ります。その ますを おすと 進みます。えらんだ 駒の うごきかたは 盤の 下に 出ます。",
  c_shogiHow2Head: "取った駒は つかえる",
  c_shogiHow2:
    "あいての 駒を 取ると じぶんの もちごまに なります。もちごまを おして、あいている ますに 打てます。",
  c_shogiHow3Head: "成る",
  c_shogiHow3:
    "あいての じんち（むこうがわの 3 だん）に 入ると 駒が つよく なれます。入る ときに 「なりますか？」と きかれます。",
  c_shogiHow4Head: "できないこと",
  c_shogiHow4:
    "おなじ すじに 歩を 2 まい（二歩）／もう うごけない ところへ 歩・香・桂を 打つ／歩を 打って いきなり つませる（打ち歩詰め）。この 3 つは はじめから えらべません。",
  c_shogiHow5Head: "王手と かち",
  c_shogiHow5:
    "玉が ねらわれたら（王手）、かならず 助ける手を さします。どこにも 逃げられなく なったら つみ＝しょうぶ ありです。",
  c_shogiHow6Head: "おうを むこうへ はこぶ",
  c_shogiHow6:
    "おたがいの おうが あいての じんちに 入ると、つみに ならなく なる ことが あります。その ときは じんちに 入った こまと もちごまの てんすう（飛車と角は 5 てん、ほかは 1 てん）で おわりに できます。できる ときだけ 盤の 下に ボタンが 出ます（31 てん いじょうで かち、24 てんから ひきわけ）。",
  c_shogiHow7Head: "おうてを くりかえす とき",
  c_shogiHow7:
    "おなじ ばんめんが 4 かい 出たら そこで おわりです。ふつうは ひきわけですが、ずっと 王手を かけつづけて いた ほうが あれば その ほうの まけに なります。",
  c_shogiHow8Head: "こまった とき",
  c_shogiHow8: "「ヒント」で つぎの 一手を おしえます。「まった」で 手を もどせます。",
  c_back: "もどる",

  // --- しょうぎ（対局中） ---
  c_shogiQuit: "やめる",
  c_shogiFlip: "ばんめんを まわす",
  c_shogiHint: "ヒント",
  c_shogiUndo: "まった",
  c_shogiResign: "まけました",
  c_shogiMoves: "これまでの て",
  c_shogiPromoteAsk: "なりますか？",
  c_shogiPromoteYes: "なる",
  c_shogiPromoteNo: "そのまま",
  c_shogiAgain: "もういちど",
  c_shogiSeeBoard: "ばんめんを 見る",

  // --- さんすう（トップ） ---
  c_whoHello: "はじめまして",
  c_whoSwitch: "つかう人を かえる ▼",
  c_records: "きろく",
  c_whoNameTitle: "なまえを きめよう",
  c_whoNameLede: "この きろくは この たんまつの なかだけに のこります。",
  c_whoNamePh: "なまえ",
  c_whoStart: "はじめる",
  c_dailyLabel: "きょうの 1まい",
  c_timeLabel: "タイムアタック",
  c_timeGo: "60びょう",
  c_levelRank: "レベル 1",

  // --- 問題・けっか・しょうじょう ---
  c_quizQuit: "やめる",
  c_resultAgain: "もういちど",
  c_resultOther: "ほかの もんだい",
  c_awardPrint: "いんさつ する",

  // --- きろく ---
  c_kirokuTitle: "きろく",
  c_kirokuLede: "きろくは この たんまつの なかだけに あります。ほかへは 送られません。",
  c_kirokuMove: "たんまつを かえるとき",
  c_kirokuExport: "かきだす",
  c_kirokuImport: "よみこむ",

  // --- そら ---
  c_skyCanvas: "星空。指で なぞると 見まわせます。矢印キーで 見まわし、＋と−で ちかづいたり はなれたり、エンターで まんなかを 読みます",
  c_skyIn: "ちかづく",
  c_skyOut: "はなれる",
  c_skyNow: "いま",
  c_skyShiftLabel: "時こくを 前後 12 時間 動かす",
  c_skyWhen: "日づけと 時こく",
  c_skySpeed: "時間を 送る",
  c_skyWhere: "見る 場所",
  c_skyFaceSouth: "南を むく",
  c_skyShow: "出すもの",
  c_skyLines: "星座の 線",
  c_skyNames: "星座の 名前",
  c_skyMilky: "天の川",
  c_skyAbout: "この 空に ついて",
  c_skyAbout1:
    "画面を 指で なぞると 見まわせます。2 本の 指で ひろげると ちかづきます。星を 押すと、名前と 明るさが 出ます。",
  c_skyAbout2:
    "出して いるのは 目で 見える 明るさ（6.5 等）までの 星 8,404 個です。星の 色は 実際の 色に 合わせて います。青いほど 熱く、赤いほど ぬるい 星です。",
  c_skyAbout3:
    "月と 太陽と 惑星の 位置は、その 時刻に 合わせて この 場で 計算して います。地球の 首ふり（歳差）で 2000 年から ずれた ぶんも 直して います。",
  c_skyAbout4: "電波が 無くても 動きます。見た 記録は どこにも 送りません。",
  c_skyCredit1: "星の 位置は",
  c_skyCredit2:
    "（Hoffleit & Warren 1991・VizieR/CDS の V/50）から。星座の 線と 名前、天の川の かたちは",
  c_skyCredit3:
    "（Copyright (c) 2015, Olaf Frohn・BSD 3-Clause License）から お借りして います。どちらも つくった 方の 表示を のこした まま つかって います。",
  c_skyCreditLink: "くわしい 表示",

  // --- 支援（このサイトについて） ---
  c_supportMore: "くわしい人むけ",
  supportNav: "支援",
  supportHeading: "このサイトについて",
  supportIntro:
    "このサイトは 広告も 会員登録も ありません。動かすのに すこしだけ お金が かかっていて、いまは 作った人が はらっています。",
  fuelHeading: "いま どれくらい うごかせるか",
  fuelYears: "{0} 年ぶん",
  fuelMonths: "{0} か月ぶん",
  fuelDetail: "のこり {0} ／ 1年に {1} つかいます",
  fuelUnknown: "いま しらべられません",
  supportHow: "支援の方法",
  supportHow1:
    "下の「データの置き場所」に燃料を入れてください。多くのサービスは、この文字列（キャニスター ID）だけで受け付けます。",
  supportHow2: "詳しい人向け（ウォレットから送る場合）:",
  backendIdLabel: "データの置き場所",
  frontendIdLabel: "ページの置き場所",
  copy: "コピー",
  noIcpNote:
    "ICP をそのまま送っても燃料にはなりません。ICP を燃料（サイクル）に換える必要があります。",
  waysHeading: "燃料の用意のしかた",
  wayNns: "NNS — 公式のアプリ。ICP を燃料に換えて、置き場所を指定して入れられます。",
  wayTopup: "icptopup.com — 置き場所の文字列だけで入れられるサービス。",
  wayCycleops: "CycleOps — 残りが減ったら自動で足してくれるサービス。",
  wayDex: "ICPSwap — 先に ICP を用意するための取引所（DEX）。",
  supportThanks: "動かし続けてくださって、ありがとうございます。",
  backHome: "戻る",
  counterNote: "このサイトは元々カウンターでした。まだここにいます。",
};
