/**
 * さんすうドリルの 文言（drill.js / drill-data.js から 出るもの）。
 *
 * 日本語は こども向けなので、ひらがな 中心の やさしい 言い方に そろえる。
 * 英語も 同じ ねらいで、みじかく やさしい 語を えらぶ。
 *
 * 単位・記号（cm, mm, g, kg, cm2, cm3, ％, 3.14, ÷, ×, ★, □）は
 * どちらの ことばでも そのまま 出す。
 */

export const drillEn = {
  // --- とけい（読みあげ方）---------------------------------------------------
  // {0}=時 {1}=分 {2}=分（2けたに そろえたもの）
  dr_clockHour: "{0} o'clock",
  dr_clockMinPun: "{0}:{2}",
  dr_clockMinFun: "{0}:{2}",

  // --- 単元の 名まえ（1年）--------------------------------------------------
  dr_u1Add: "Addition",
  dr_u1AddCarry: "Addition with carrying",
  dr_u1Sub: "Subtraction",
  dr_u1SubBorrow: "Subtraction with borrowing",
  dr_u1Missing: "The missing number",
  dr_u1Clock: "Clock (o'clock and half past)",

  // --- 単元の 名まえ（2年）--------------------------------------------------
  dr_u2Add2: "Two-digit addition",
  dr_u2Sub2: "Two-digit subtraction",
  dr_u2Kuku: "Times tables",
  dr_u2Clock: "Clock (hours and minutes)",
  dr_u2ClockCalc: "Working out time",
  dr_u2Length: "Length (cm and mm)",

  // --- 単元の 名まえ（3年）--------------------------------------------------
  dr_u3Div: "Division",
  dr_u3DivRem: "Division with remainders",
  dr_u3Mul: "Long multiplication",
  dr_u3Frac: "Adding fractions (same denominator)",
  dr_u3Weight: "Weight (g and kg)",
  dr_u3Time: "Time and how long",

  // --- 単元の 名まえ（4年）--------------------------------------------------
  dr_u4Div: "Long division",
  dr_u4Round: "Rounding",
  dr_u4Dec: "Adding and subtracting decimals",
  dr_u4Area: "Area of a rectangle",
  dr_u4Angle: "Angles",
  dr_u4Improper: "Mixed numbers to improper fractions",

  // --- 単元の 名まえ（5年）--------------------------------------------------
  dr_u5Frac: "Adding fractions (different denominators)",
  dr_u5DecMul: "Multiplying decimals",
  dr_u5Percent: "Percentages",
  dr_u5Average: "Averages",
  dr_u5Volume: "Volume (cuboids)",
  dr_u5Rate: "Unit price",

  // --- 単元の 名まえ（6年）--------------------------------------------------
  dr_u6FracMul: "Multiplying fractions",
  dr_u6FracDiv: "Dividing fractions",
  dr_u6Ratio: "Simplifying ratios",
  dr_u6Speed: "Speed",
  dr_u6Circle: "Area of a circle (3.14)",
  dr_u6Cases: "Counting possibilities",

  // --- 九九の だん ----------------------------------------------------------
  dr_kukuAll: "All of them",
  dr_kukuRow: "{0} times table",

  // --- 問題の 文 ------------------------------------------------------------
  dr_qWhatHour: "What time is it?",
  dr_qWhatTime: "What time is it?",
  dr_qToHour: "{0} minutes have gone. How many more make an hour?",
  dr_qCmMm: "{0}cm {1}mm — how many mm?",
  dr_qRemainder: "{0} ÷ {1} — what is left over?",
  dr_qKgG: "{0}kg {1}g — how many g?",
  dr_qHourMin: "{0} hours {1} minutes — how many minutes?",
  dr_qRound: "Round {0} to the nearest hundred",
  dr_hRound: "Look at the tens digit",
  dr_qRectArea: "A rectangle {0}cm tall and {1}cm wide. Its area (cm2)?",
  dr_qAngle: "What is the angle next to {0} degrees? (A straight line is 180 degrees)",
  dr_qImproper: "Write {0} and {1}/{2} as an improper fraction",
  dr_qPercent: "What is {1}％ of {0} yen?",
  dr_qAverage: "The average of {0}",
  dr_listSep: ", ",
  dr_qVolume: "The volume of {0}cm × {1}cm × {2}cm (cm3)",
  dr_qUnitPrice: "A sweet costs {0} yen. What do {1} of them cost?",
  dr_qRatio: "Simplify {0} : {1} to get {2} : □",
  dr_qSpeed: "Going {0}km an hour for {1} hours — how many km?",
  dr_qCircle: "A circle with radius {0}cm. Its area (cm2)?",
  dr_hCircle: "radius × radius × 3.14",
  dr_qCasesLine: "{0} children line up. How many orders are there?",
  dr_qCasesPick: "Pick 2 children out of {0}. How many ways are there?",
  dr_qCasesCoin: "You toss a coin {0} times. How many heads-and-tails patterns?",

  // --- トップ（つづけている 日数・にがて・単元）------------------------------
  dr_streakDays: "{0} days in a row!",
  dr_streakToday: "Let's do one today",
  dr_weakTitle: "Try these again",
  dr_lastScore: "Last time {0} points",
  dr_firstTime: "New",
  dr_whichRow: "Which table?",
  dr_gradeTab: "Grade {0}",

  // --- つかう人 -------------------------------------------------------------
  dr_whoTitle: "Who is using this",
  dr_whoRename: "Change the name",
  dr_whoNew: "Someone new",
  dr_close: "Close",
  dr_namePh: "name",
  dr_save: "Save",
  dr_cancel: "Cancel",

  // --- チャレンジ -----------------------------------------------------------
  dr_challengeTitle: "Keep-going challenge",
  dr_challengeLede: "Do one sheet a day and get a certificate at the end.",
  dr_challengeSummerBtn: "Summer holiday (7/21-8/31)",
  dr_challengeSummer: "Summer holiday challenge",
  dr_challengeMonth: "30-day challenge",
  dr_challengeAllDone: "All done! Get your certificate",
  dr_challengeEnded: "That's the end. You did {0} of {1} days",
  dr_challengeLeft: "{0} of {1} days · {2} to go",
  dr_seeAward: "See your certificate",
  dr_stop: "Stop",
  dr_reallyStop: "Really stop?",

  // --- きょうの 1まい / タイムアタック --------------------------------------
  dr_timeLeft: "{0} seconds left",
  dr_timeUnit: "Time attack (Grade {0})",
  dr_dailyUnit: "Today's sheet (Grade {0})",
  dr_dailyDoneStreak: "Done for today! {0} days in a row",
  dr_dailyDone: "Done for today!",
  dr_dailyNext: "Do it and that makes {0} days",
  dr_dailyStart: "Have a go at 10 questions",
  dr_dailyAgain: "Once more",
  dr_dailyGo: "Start",
  dr_bestCount: "Your best so far: {0}",
  dr_timePrompt: "How many can you do in 60 seconds?",
  dr_levelRank: "Level {0}",
  dr_levelNeed: "★{0} to go",

  // --- 問題の 画面 ----------------------------------------------------------
  dr_rightCount: "{0} correct",
  dr_padDel: "Delete",
  dr_padOk: "Answer",
  dr_seikai: "Correct!",
  dr_theAnswer: "The answer is {0}",
  dr_combo: "{0} in a row!",

  // --- けっか ---------------------------------------------------------------
  dr_newBest: "Your best ever!",
  dr_finished: "That's it",
  dr_timeScore: "{0} correct in 60 seconds",
  dr_allCorrect: "All correct!",
  dr_wellDone: "Well done",
  dr_tryAgain: "Have another go",
  dr_scoreOf: "{1} out of {0} correct",
  dr_starLevelUp: "You got ★{0} and reached level {1}!",
  dr_starGain: "You got ★{0}",

  // --- きろく ---------------------------------------------------------------
  dr_inUse: " (in use)",
  dr_delete: "Delete",
  dr_reallyDelete: "Really delete?",
  dr_noPeople: "Nobody here yet.",
  // 表の中は 見出しが 意味を もつので、数だけを 出す
  dr_qCount: "{0}",
  dr_points: "{0}",
  dr_thUnit: "Topic",
  dr_thGrade: "Grade",
  dr_thTried: "Tried",
  dr_thRate: "Right",
  dr_thBest: "Best",
  dr_kirokuLine: "★ {0} · {1} days in a row",
  dr_noRecords: "No records yet.",
  dr_exported: "Saved to a file.",
  dr_imported: "File read.",
  dr_importFailed: "That file could not be read.",
  dr_weekdays: "Sun Mon Tue Wed Thu Fri Sat",
  dr_calHead: "{1}/{0} · done on {2} days",

  // --- しょうじょう ---------------------------------------------------------
  dr_noChallenge: "No challenge yet.",
  dr_awardDate: "{1}/{2}/{0}",
  dr_awardTitle: "Certificate",
  dr_awardCard: "Well-done card",
  dr_awardTo: "For {0}",
  dr_awardBody:
    "In the {0}<br>you did <b>{2} days</b> out of {1}.<br>You collected ★{3} and reached level {4}.<br>Well done for keeping at it.",
};

export const drillJa = {
  // --- とけい（読みあげ方）---------------------------------------------------
  dr_clockHour: "{0}じ",
  dr_clockMinPun: "{0}じ{1}ぷん",
  dr_clockMinFun: "{0}じ{1}ふん",

  // --- 単元の 名まえ（1年）--------------------------------------------------
  dr_u1Add: "たしざん",
  dr_u1AddCarry: "くり上がりの たしざん",
  dr_u1Sub: "ひきざん",
  dr_u1SubBorrow: "くり下がりの ひきざん",
  dr_u1Missing: "□に はいる かず",
  dr_u1Clock: "とけい（なんじ・なんじはん）",

  // --- 単元の 名まえ（2年）--------------------------------------------------
  dr_u2Add2: "2けたの たしざん",
  dr_u2Sub2: "2けたの ひきざん",
  dr_u2Kuku: "九九",
  dr_u2Clock: "とけい（なんじなんぷん）",
  dr_u2ClockCalc: "じかんの けいさん",
  dr_u2Length: "ながさ（cm と mm）",

  // --- 単元の 名まえ（3年）--------------------------------------------------
  dr_u3Div: "わり算",
  dr_u3DivRem: "あまりの ある わり算",
  dr_u3Mul: "かけ算の ひっ算",
  dr_u3Frac: "分数の たし算（同じ分母）",
  dr_u3Weight: "重さ（g と kg）",
  dr_u3Time: "時こくと 時間",

  // --- 単元の 名まえ（4年）--------------------------------------------------
  dr_u4Div: "わり算の ひっ算",
  dr_u4Round: "がい数（四捨五入）",
  dr_u4Dec: "小数の たし算・ひき算",
  dr_u4Area: "長方形の 面積",
  dr_u4Angle: "角の 大きさ",
  dr_u4Improper: "帯分数を 仮分数に",

  // --- 単元の 名まえ（5年）--------------------------------------------------
  dr_u5Frac: "分数の たし算（分母がちがう）",
  dr_u5DecMul: "小数の かけ算",
  dr_u5Percent: "割合（％）",
  dr_u5Average: "平均",
  dr_u5Volume: "体積（直方体）",
  dr_u5Rate: "単位量あたり",

  // --- 単元の 名まえ（6年）--------------------------------------------------
  dr_u6FracMul: "分数の かけ算",
  dr_u6FracDiv: "分数の わり算",
  dr_u6Ratio: "比を かんたんに",
  dr_u6Speed: "速さ",
  dr_u6Circle: "円の 面積（3.14）",
  dr_u6Cases: "場合の数",

  // --- 九九の だん ----------------------------------------------------------
  dr_kukuAll: "ぜんぶ",
  dr_kukuRow: "{0}の だん",

  // --- 問題の 文 ------------------------------------------------------------
  dr_qWhatHour: "なんじ？",
  dr_qWhatTime: "なんじ なんぷん？",
  dr_qToHour: "{0}ぷん は、1じかん まで あと なんぷん？",
  dr_qCmMm: "{0}cm{1}mm は なんmm？",
  dr_qRemainder: "{0} ÷ {1} の あまり",
  dr_qKgG: "{0}kg{1}g は なんg？",
  dr_qHourMin: "{0}じかん{1}ふん は なんぷん？",
  dr_qRound: "{0} を 百のくらいまでの がい数に",
  dr_hRound: "十のくらいを 四捨五入",
  dr_qRectArea: "たて {0}cm、よこ {1}cm の 長方形の 面積（cm2）",
  dr_qAngle: "{0}度 の となりの 角は？（一直線は 180度）",
  dr_qImproper: "{0}と {1}/{2} を 仮分数に",
  dr_qPercent: "{0}円の {1}％ は なん円？",
  dr_qAverage: "{0} の 平均",
  dr_listSep: "、",
  dr_qVolume: "{0}cm × {1}cm × {2}cm の 体積（cm3）",
  dr_qUnitPrice: "1こ {0}円の おかしを {1}こ 買うと？",
  dr_qRatio: "{0} : {1} を かんたんに すると {2} : □",
  dr_qSpeed: "時速 {0}km で {1}時間 すすむと なんkm？",
  dr_qCircle: "半径 {0}cm の 円の 面積（cm2）",
  dr_hCircle: "半径 × 半径 × 3.14",
  dr_qCasesLine: "{0}人が 1れつに ならぶ ならびかたは なんとおり？",
  dr_qCasesPick: "{0}人から 2人を えらぶ えらび方は なんとおり？",
  dr_qCasesCoin: "コインを {0}回 なげたとき、表と裏の 出方は なんとおり？",

  // --- トップ（つづけている 日数・にがて・単元）------------------------------
  dr_streakDays: "{0}日 つづいているよ",
  dr_streakToday: "きょうも やろう",
  dr_weakTitle: "にがてを もういちど",
  dr_lastScore: "まえは {0}点",
  dr_firstTime: "はじめて",
  dr_whichRow: "どの だん？",
  dr_gradeTab: "{0}年",

  // --- つかう人 -------------------------------------------------------------
  dr_whoTitle: "つかう人",
  dr_whoRename: "なまえを かえる",
  dr_whoNew: "あたらしい人",
  dr_close: "とじる",
  dr_namePh: "なまえ",
  dr_save: "ほぞん",
  dr_cancel: "やめる",

  // --- チャレンジ -----------------------------------------------------------
  dr_challengeTitle: "つづける チャレンジ",
  dr_challengeLede: "まいにち 1まい やって、さいごに しょうじょうを もらおう。",
  dr_challengeSummerBtn: "なつやすみ（7/21〜8/31）",
  dr_challengeSummer: "なつやすみ チャレンジ",
  dr_challengeMonth: "30日 チャレンジ",
  dr_challengeAllDone: "ぜんぶ たっせい！ しょうじょうを もらおう",
  dr_challengeEnded: "おしまい。{0} / {1}日 やったよ",
  dr_challengeLeft: "{0} / {1}日 ／ のこり {2}日",
  dr_seeAward: "しょうじょうを みる",
  dr_stop: "やめる",
  dr_reallyStop: "ほんとうに やめる？",

  // --- きょうの 1まい / タイムアタック --------------------------------------
  dr_timeLeft: "のこり {0}びょう",
  dr_timeUnit: "タイムアタック（{0}年）",
  dr_dailyUnit: "きょうの 1まい（{0}年）",
  dr_dailyDoneStreak: "きょうは おわり！ {0}日 つづいているよ",
  dr_dailyDone: "きょうは おわり！",
  dr_dailyNext: "つづけると {0}日 めだよ",
  dr_dailyStart: "10もん やってみよう",
  dr_dailyAgain: "もういちど",
  dr_dailyGo: "やる",
  dr_bestCount: "いままでの さいこう {0}もん",
  dr_timePrompt: "60びょうで 何もん とける？",
  dr_levelRank: "レベル {0}",
  dr_levelNeed: "あと ★{0}",

  // --- 問題の 画面 ----------------------------------------------------------
  dr_rightCount: "{0}もん せいかい",
  dr_padDel: "けす",
  dr_padOk: "こたえる",
  dr_seikai: "せいかい！",
  dr_theAnswer: "こたえは {0}",
  dr_combo: "{0}れんぞく！",

  // --- けっか ---------------------------------------------------------------
  dr_newBest: "さいこう記録！",
  dr_finished: "おしまい",
  dr_timeScore: "60びょうで {0}もん せいかい",
  dr_allCorrect: "ぜんもん せいかい！",
  dr_wellDone: "よく できました",
  dr_tryAgain: "もう いっかい やってみよう",
  dr_scoreOf: "{0}もんちゅう {1}もん せいかい",
  dr_starLevelUp: "★を {0}こ もらって レベル {1} に なった！",
  dr_starGain: "★を {0}こ もらったよ",

  // --- きろく ---------------------------------------------------------------
  dr_inUse: "（つかっている）",
  dr_delete: "けす",
  dr_reallyDelete: "ほんとうに けす？",
  dr_noPeople: "まだ だれも いません。",
  dr_qCount: "{0}もん",
  dr_points: "{0}点",
  dr_thUnit: "たんげん",
  dr_thGrade: "学年",
  dr_thTried: "やった数",
  dr_thRate: "できた",
  dr_thBest: "さいこう",
  dr_kirokuLine: "★ {0} ／ {1}日 つづいている",
  dr_noRecords: "まだ きろくが ありません。",
  dr_exported: "かきだしました。",
  dr_imported: "よみこみました。",
  dr_importFailed: "よみこめませんでした。",
  dr_weekdays: "日 月 火 水 木 金 土",
  dr_calHead: "{0}年 {1}月 ／ {2}日 やったよ",

  // --- しょうじょう ---------------------------------------------------------
  dr_noChallenge: "まだ チャレンジを していません。",
  dr_awardDate: "{0}年 {1}月 {2}日",
  dr_awardTitle: "しょうじょう",
  dr_awardCard: "がんばりカード",
  dr_awardTo: "{0} どの",
  dr_awardBody:
    "{0} で<br>{1}日 のうち <b>{2}日</b> やりました。<br>★を {3}こ あつめて レベル {4} に なりました。<br>その がんばりを ここに たたえます。",
};
