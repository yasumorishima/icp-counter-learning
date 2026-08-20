/**
 * しょうぎの 動く 部分の 文言。
 * 画面の 骨組み（ボタン・「あそびかた」）は index.html 側 ＝ i18n-core に ある。
 *
 * 盤の 上の 駒は どの ことばでも 漢字の まま（歩・香・桂…）。
 * ここの sg_pc* は「文章の 中で 駒を 名ざしする とき」だけに つかう。
 *
 * ます目（７六 など）は 盤の ものさしも 棋譜も きまりの 側が 作るので、
 * どの ことばでも 漢数字の まま そろえる。
 */

export const shogiEn = {
  // --- 駒の 名前（文章の 中で つかう）---
  sg_pc1: "Pawn",
  sg_pc2: "Lance",
  sg_pc3: "Knight",
  sg_pc4: "Silver",
  sg_pc5: "Gold",
  sg_pc6: "Bishop",
  sg_pc7: "Rook",
  sg_pc8: "King",
  sg_pc9: "Promoted pawn",
  sg_pc10: "Promoted lance",
  sg_pc11: "Promoted knight",
  sg_pc12: "Promoted silver",
  sg_pc14: "Horse",
  sg_pc15: "Dragon",

  // --- 駒の うごきかた ---
  sg_how1: "one square forward",
  sg_how2: "straight forward, as far as you like",
  sg_how3: "two forward and one across, jumping over anything in the way",
  sg_how4: "forward, and the four diagonals",
  sg_how5: "forward, sideways and straight back (but not diagonally back)",
  sg_how6: "diagonally, as far as you like",
  sg_how7: "up, down and across, as far as you like",
  sg_how8: "one square, in any of the eight directions",
  sg_how9: "moves just like a Gold",
  sg_how10: "moves just like a Gold",
  sg_how11: "moves just like a Gold",
  sg_how12: "moves just like a Gold",
  sg_how14: "diagonally as far as you like, plus one square up, down or across",
  sg_how15: "up, down and across as far as you like, plus one square diagonally",

  // --- あいての つよさ ---
  sg_lv1: "Easy",
  sg_lv2: "Normal",
  sg_lv3: "Strong",

  // 2 つの 文を つなぐ（日本語は そのまま、英語は 空白を はさむ）
  sg_join: "{0} {1}",

  // --- しょうぶが ついた とき ---
  sg_mateWin: "Checkmate! You win.",
  sg_mateLose: "Checkmate. You lose.",
  sg_repDraw: "The same position came up four times. It is a draw (repetition).",
  sg_repLose: "You kept giving check, so you lose (the same position came up four times).",
  sg_repWin: "Your opponent kept giving check, so you win (the same position came up four times).",
  sg_resigned: "You resigned.",
  sg_aiDeclWin: "Your opponent walked their king into your camp and won on points.",
  sg_declWinFinish: "You walked your king into your opponent's camp and won on {0} points.",
  sg_declDrawFinish: "You ended the game as a draw on {0} points.",

  // --- 盤（読み上げ用の ことば）---
  sg_empty: "empty",
  sg_mine: "your ",
  sg_theirs: "your opponent's ",

  // --- もちごま ---
  sg_handCount: "{0}, {1} in hand",
  sg_myHand: "Your pieces in hand",
  sg_theirHand: "Your opponent's pieces in hand",
  sg_handNone: "none",

  // --- いまの ようす ---
  sg_thinking: "Your opponent is thinking…",
  sg_checkYou: "Check! Save your king.",
  sg_checkThem: "You gave check.",
  sg_yourTurn: "Your turn",
  sg_theirTurn: "Your opponent's turn",
  sg_rep3: " (The same position has come up three times. One more and the game ends.)",

  // --- 盤の 下の てびき ---
  sg_pickPiece: "Tap the piece you want to move.",
  sg_dropWhere: "Tap where you want to drop the {0}. You can put it on any green square.",
  sg_whyKing: "✕ marks the squares your opponent is attacking. Your king may not go there.",
  sg_whyOther: "Moving to ✕ would let your king be taken, so you may not play it.",
  sg_kingSurrounded: "Every square around your king is attacked.",
  sg_cantMoveNow: "The {0} cannot move right now.",
  sg_checkOtherPiece: "You are in check. This piece cannot save your king. Pick another one.",
  sg_noSquares: "The {0} cannot move right now (there is nowhere for it to go).",
  sg_howLine: "{0}: {1}",
  sg_howLineWhy: "{0}: {1} {2}",
  sg_promoteCancel: "That move is cancelled. Nothing has been played yet. Tap a square again.",

  // --- ヒント ---
  sg_hintDrop: "How about dropping the {0} from your hand on {1}?",
  sg_hintMove: "How about moving to {0}?",

  // --- 成る ---
  sg_takes: "You take the {0}.",
  sg_promoteNote: "When the {0} promotes it becomes a “{1}” ({2}).",

  // --- おうを むこうへ はこぶ（てんすうで おわりに する）---
  sg_declHead: "Your king has reached your opponent's camp. You have {0} points so far.",
  sg_declWinBtn: "Win on points",
  sg_declDrawBtn: "Draw on points",
  sg_declWinNote: "Ending the game here means you win.",
  sg_declDrawNote: "Ending the game here is a draw (31 points or more wins).",
  sg_declNeedCheck: "get out of check first",
  sg_declNeedPieces: "{0} more pieces in the camp",
  sg_declNeedPoints: "{0} more points",
  sg_declSlash: " / ",
  sg_declCanEnd: "{0} and you can end the game.",

  // --- 見出し・記録 ---
  sg_chip: "Opponent: {0} · You: {1}",
  sg_sente: "Black",
  sg_gote: "White",
  sg_senteFull: "Black (moves first)",
  sg_goteFull: "White (moves second)",
  sg_overWin: "You win!",
  sg_overLose: "You lose",
  sg_overDraw: "Draw",
  sg_record: "So far: {0} won, {1} lost, {2} drawn",
  sg_noteRecord: "{0} So far: {1} won, {2} lost, {3} drawn",
};

export const shogiJa = {
  // --- 駒の 名前（文章の 中で つかう）---
  sg_pc1: "歩",
  sg_pc2: "香",
  sg_pc3: "桂",
  sg_pc4: "銀",
  sg_pc5: "金",
  sg_pc6: "角",
  sg_pc7: "飛",
  sg_pc8: "玉",
  sg_pc9: "と",
  sg_pc10: "成香",
  sg_pc11: "成桂",
  sg_pc12: "成銀",
  sg_pc14: "馬",
  sg_pc15: "龍",

  // --- 駒の うごきかた ---
  sg_how1: "まえに 1 ます",
  sg_how2: "まえに まっすぐ どこまでも",
  sg_how3: "まえに 2・よこに 1（とびこす）",
  sg_how4: "まえと ななめ 4 ほうこう",
  sg_how5: "まえ・よこ・うしろ（ななめ うしろ いがい）",
  sg_how6: "ななめに どこまでも",
  sg_how7: "たてよこに どこまでも",
  sg_how8: "まわり 8 ます",
  sg_how9: "金と おなじ うごき",
  sg_how10: "金と おなじ うごき",
  sg_how11: "金と おなじ うごき",
  sg_how12: "金と おなじ うごき",
  sg_how14: "ななめ どこまでも ＋ たてよこ 1 ます",
  sg_how15: "たてよこ どこまでも ＋ ななめ 1 ます",

  // --- あいての つよさ ---
  sg_lv1: "よわい",
  sg_lv2: "ふつう",
  sg_lv3: "つよい",

  sg_join: "{0}{1}",

  // --- しょうぶが ついた とき ---
  sg_mateWin: "つみ！ あなたの かちです",
  sg_mateLose: "つみ。あなたの まけです",
  sg_repDraw: "おなじ ばんめんが 4 かい。ひきわけ（せんにちて）です",
  sg_repLose: "おうてを かけつづけたので あなたの まけです（おなじ ばんめんが 4 かい）",
  sg_repWin: "あいてが おうてを かけつづけたので あなたの かちです（おなじ ばんめんが 4 かい）",
  sg_resigned: "まけを みとめました",
  sg_aiDeclWin: "あいてが おうを じんちへ はこんで、てんすうで かちました",
  sg_declWinFinish: "おうを あいての じんちへ はこんで、てんすう {0} てんで かちました",
  sg_declDrawFinish: "てんすう {0} てんで ひきわけに しました",

  // --- 盤（読み上げ用の ことば）---
  sg_empty: "あき",
  sg_mine: "じぶんの ",
  sg_theirs: "あいての ",

  // --- もちごま ---
  sg_handCount: "{0} {1}まい",
  sg_myHand: "じぶんの もちごま",
  sg_theirHand: "あいての もちごま",
  sg_handNone: "なし",

  // --- いまの ようす ---
  sg_thinking: "あいてが かんがえています…",
  sg_checkYou: "王手！ にげてください",
  sg_checkThem: "王手を かけました",
  sg_yourTurn: "あなたの ばんです",
  sg_theirTurn: "あいての ばんです",
  sg_rep3: "　（おなじ ばんめんが 3 かい。あと 1 かいで おわりです）",

  // --- 盤の 下の てびき ---
  sg_pickPiece: "うごかしたい 駒を おしてね。",
  sg_dropWhere: "{0}を 打つ ばしょを おしてね。みどりの ますに おけます。",
  sg_whyKing: "✕ は あいてに ねらわれている ますです。玉は そこへ 入れません。",
  sg_whyOther: "✕ へ 動かすと 玉が 取られて しまうので 指せません。",
  sg_kingSurrounded: "玉の まわりは 全部 ねらわれています。",
  sg_cantMoveNow: "{0}は いま 動かせません。",
  sg_checkOtherPiece: "王手が かかっています。この駒では 玉を 助けられません。ほかの駒を えらんでね。",
  sg_noSquares: "{0}は いま うごけません（行ける ますが ありません）。",
  sg_howLine: "{0}：{1}",
  sg_howLineWhy: "{0}：{1}　{2}",
  sg_promoteCancel: "その手は やめました。まだ 指していません。もう いちど ますを おしてね。",

  // --- ヒント ---
  sg_hintDrop: "もちごまの {0}を {1}に 打つのは どうかな。",
  sg_hintMove: "{0}へ うごかすのは どうかな。",

  // --- 成る ---
  sg_takes: "{0}を 取ります。",
  sg_promoteNote: "{0}は 成ると 「{1}」に なります（{2}）。",

  // --- おうを むこうへ はこぶ（てんすうで おわりに する）---
  sg_declHead: "おうが あいての じんちに 入りました。いまの てんすうは {0} てん。",
  sg_declWinBtn: "てんすうで かちに する",
  sg_declDrawBtn: "てんすうで ひきわけに する",
  sg_declWinNote: "ここで おわりに すると あなたの かちです。",
  sg_declDrawNote: "ここで おわりに すると ひきわけです（31 てん いじょうで かち）。",
  sg_declNeedCheck: "さきに 王手を ふせぐ",
  sg_declNeedPieces: "じんちの こまが あと {0} まい",
  sg_declNeedPoints: "てんすうが あと {0} てん",
  sg_declSlash: "／",
  sg_declCanEnd: "{0} で おわりに できます。",

  // --- 見出し・記録 ---
  sg_chip: "あいて：{0}　じぶん：{1}",
  sg_sente: "せんて",
  sg_gote: "ごて",
  sg_senteFull: "せんて（さきに 指す）",
  sg_goteFull: "ごて（あとから 指す）",
  sg_overWin: "かちました！",
  sg_overLose: "まけました",
  sg_overDraw: "ひきわけ",
  sg_record: "これまで {0} かち {1} まけ {2} わけ",
  sg_noteRecord: "{0}　これまで {1} かち {2} まけ {3} わけ",
};
