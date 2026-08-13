// キマル — 書き換えられない日程調整 / tamper-evident scheduling poll
//
// 設計方針
//  - 回答は上書きせず追記する（誰がいつ変えたかが消えない）
//  - 主催者と回答者はブラウザで生成した鍵の principal。秘密鍵はオンチェーンに置かない
//  - 各回答には端末タグ（principal から導く短い文字列）を付ける。
//    同じ名前が別の端末から書き換えられたら画面で分かる
//  - エラーは言語に依存しないコードで返し、表示側で翻訳する
//  - 保存量と cycles を有界にするため、全ての入力に上限を設け、90 日で自動削除する

import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Char "mo:base/Char";
import Cycles "mo:base/ExperimentalCycles";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Principal "mo:base/Principal";
import Random "mo:base/Random";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Trie "mo:base/Trie";

persistent actor Kimaru {

  /// ページを配っているキャニスター。燃料の残りを一緒に見せるために持つ
  let FRONTEND_ID = "iqjbc-7aaaa-aaaaj-qnnsa-cai";

  /// 管理キャニスター。自分（と、controller に入っている相手）の状態を読むのに使う
  transient let IC = actor "aaaaa-aa" : actor {
    canister_status : ({ canister_id : Principal }) -> async {
      cycles : Nat;
      idle_cycles_burned_per_day : Nat;
    };
  };


  // ---- 型 ------------------------------------------------------------------

  public type Choice = { #yes; #maybe; #no };

  /// 保存される 1 回の回答。追記のみで、過去のものは書き換えない
  type Record = {
    name : Text;
    comment : Text;
    choices : [Choice];
    at : Int; // ナノ秒
    by : Principal;
  };

  /// 画面に返す形。principal そのものは出さず、短い端末タグだけを見せる
  public type Entry = {
    name : Text;
    comment : Text;
    choices : [Choice];
    at : Int;
    tag : Text;
    mine : Bool; // この端末が書いた回答か（取り消しボタンの出し分けに使う）
  };

  type Poll = {
    id : Text;
    title : Text;
    note : Text;
    options : [Text];
    owner : Principal;
    createdAt : Int;
    deadline : ?Int;
    closed : Bool;
    lockNames : Bool;
    entries : [Record];
  };

  public type PollView = {
    id : Text;
    title : Text;
    note : Text;
    options : [Text];
    createdAt : Int;
    deadline : ?Int;
    closed : Bool;
    lockNames : Bool;
    isOwner : Bool;
    myTag : Text;
    entries : [Entry];
  };

  /// 支援ページに出す 燃料の話
  public type Fuel = {
    dataCycles : Nat;
    dataPerDay : Nat;
    pageCycles : ?Nat;
    pagePerDay : ?Nat;
  };

  public type NewPoll = {
    title : Text;
    note : Text;
    options : [Text];
    deadline : ?Int;
    lockNames : Bool;
  };

  public type Health = {
    polls : Nat;
    entries : Nat;
    createdTotal : Nat;
    cycles : Nat;
    legacyCount : Nat;
  };

  // ---- 上限 ----------------------------------------------------------------

  transient let MAX_TITLE = 100;
  transient let MAX_NOTE = 500;
  transient let MAX_OPTIONS = 20;
  transient let MAX_OPTION_LEN = 60;
  transient let MAX_NAME = 30;
  transient let MAX_COMMENT = 200;
  transient let MAX_ENTRIES = 600;
  transient let MAX_POLLS = 5_000;

  transient let HOUR : Int = 3_600_000_000_000;
  transient let DAY : Int = 86_400_000_000_000;
  transient let RETENTION : Int = 90 * DAY;

  transient let PER_CALLER_PER_HOUR = 5;
  transient let GLOBAL_PER_HOUR = 100;
  transient let PURGE_PER_CALL = 50;

  // ---- 状態 ----------------------------------------------------------------

  var polls : Trie.Trie<Text, Poll> = Trie.empty();
  var recentByCaller : Trie.Trie<Principal, [Int]> = Trie.empty();
  var recentGlobal : [Int] = [];
  var createdTotal : Nat = 0;

  /// 前身の「禁欲カウンター」から引き継いだ値。フッターに小さく置いてある
  var legacyCount : Nat = 175;

  transient let ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789"; // 紛らわしい l 1 0 を除く

  // ---- 補助 ----------------------------------------------------------------

  func textKey(t : Text) : Trie.Key<Text> = { key = t; hash = Text.hash t };
  func principalKey(p : Principal) : Trie.Key<Principal> = { key = p; hash = Principal.hash p };

  func find(id : Text) : ?Poll = Trie.get(polls, textKey id, Text.equal);

  func save(p : Poll) {
    polls := Trie.put(polls, textKey(p.id), Text.equal, p).0;
  };

  func isBlank(t : Text) : Bool {
    for (c in t.chars()) {
      if (c != ' ' and c != '\t' and c != '\n' and c != '\r' and c != '\u{3000}') return false;
    };
    true;
  };

  func tooLong(t : Text, limit : Nat) : Bool = t.size() > limit;

  func withinHour(times : [Int], now : Int) : [Int] =
    Array.filter<Int>(times, func(t) { now - t < HOUR });

  transient let letters = Iter.toArray(ALPHABET.chars());

  func idFrom(seed : Blob) : Text {
    let out = Buffer.Buffer<Char>(8);
    var i = 0;
    for (b in seed.vals()) {
      if (i < 8) {
        out.add(letters[Nat8.toNat(b) % letters.size()]);
        i += 1;
      };
    };
    Text.fromIter(out.vals());
  };

  /// principal から 4 文字の端末タグを作る。principal 自体は復元できない
  func tagOf(p : Principal) : Text {
    var h = Nat32.toNat(Principal.hash p);
    let out = Buffer.Buffer<Char>(4);
    var i = 0;
    while (i < 4) {
      out.add(letters[h % letters.size()]);
      h /= letters.size();
      i += 1;
    };
    Text.fromIter(out.vals());
  };

  func purge(now : Int) {
    var removed = 0;
    for ((id, p) in Trie.iter(polls)) {
      if (removed < PURGE_PER_CALL and now - p.createdAt > RETENTION) {
        polls := Trie.remove(polls, textKey id, Text.equal).0;
        removed += 1;
      };
    };
  };

  func isClosed(p : Poll, now : Int) : Bool {
    switch (p.deadline) {
      case (?d) { p.closed or now > d };
      case null { p.closed };
    };
  };

  func toEntry(r : Record, caller : Principal) : Entry = {
    name = r.name;
    comment = r.comment;
    choices = r.choices;
    at = r.at;
    tag = tagOf(r.by);
    mine = Principal.equal(r.by, caller);
  };

  func view(p : Poll, caller : Principal, now : Int) : PollView = {
    id = p.id;
    title = p.title;
    note = p.note;
    options = p.options;
    createdAt = p.createdAt;
    deadline = p.deadline;
    closed = isClosed(p, now);
    lockNames = p.lockNames;
    isOwner = Principal.equal(p.owner, caller);
    myTag = tagOf(caller);
    entries = Array.map<Record, Entry>(p.entries, func(r : Record) : Entry = toEntry(r, caller));
  };

  /// 同じ名前を最初に使った端末。lockNames のときの照合に使う
  func ownerOfName(p : Poll, name : Text) : ?Principal {
    for (r in p.entries.vals()) {
      if (Text.equal(r.name, name)) return ?r.by;
    };
    null;
  };

  // ---- 作成 ----------------------------------------------------------------

  public shared (msg) func createPoll(input : NewPoll) : async Result.Result<Text, Text> {
    if (Principal.isAnonymous(msg.caller)) return #err("e_anonymous");
    if (isBlank(input.title)) return #err("e_title_required");
    if (tooLong(input.title, MAX_TITLE)) return #err("e_title_long");
    if (tooLong(input.note, MAX_NOTE)) return #err("e_note_long");
    if (input.options.size() < 1) return #err("e_option_required");
    if (input.options.size() > MAX_OPTIONS) return #err("e_option_many");

    for (o in input.options.vals()) {
      if (isBlank(o)) return #err("e_option_blank");
      if (tooLong(o, MAX_OPTION_LEN)) return #err("e_option_long");
    };

    let now = Time.now();

    switch (input.deadline) {
      case (?d) { if (d <= now) return #err("e_deadline_past") };
      case null {};
    };

    purge(now);

    if (Trie.size(polls) >= MAX_POLLS) return #err("e_storage_full");

    let mine = withinHour(
      switch (Trie.get(recentByCaller, principalKey(msg.caller), Principal.equal)) {
        case (?ts) ts;
        case null [];
      },
      now,
    );
    if (mine.size() >= PER_CALLER_PER_HOUR) return #err("e_rate_caller");

    let global = withinHour(recentGlobal, now);
    if (global.size() >= GLOBAL_PER_HOUR) return #err("e_rate_global");

    var id = idFrom(await Random.blob());
    switch (find id) {
      case (?_) { id := idFrom(await Random.blob()) };
      case null {};
    };
    switch (find id) {
      case (?_) { return #err("e_id_retry") };
      case null {};
    };

    save({
      id;
      title = input.title;
      note = input.note;
      options = input.options;
      owner = msg.caller;
      createdAt = now;
      deadline = input.deadline;
      closed = false;
      lockNames = input.lockNames;
      entries = [];
    });

    recentByCaller := Trie.put(recentByCaller, principalKey(msg.caller), Principal.equal, Array.append(mine, [now])).0;
    recentGlobal := Array.append(global, [now]);
    createdTotal += 1;

    #ok(id);
  };

  // ---- 回答 ----------------------------------------------------------------

  public shared (msg) func submitAnswer(id : Text, name : Text, comment : Text, choices : [Choice]) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(msg.caller)) return #err("e_anonymous");

    switch (find id) {
      case null { #err("e_not_found") };
      case (?p) {
        let now = Time.now();
        if (isClosed(p, now)) return #err("e_closed");
        if (isBlank(name)) return #err("e_name_required");
        if (tooLong(name, MAX_NAME)) return #err("e_name_long");
        if (tooLong(comment, MAX_COMMENT)) return #err("e_comment_long");
        if (choices.size() != p.options.size()) return #err("e_choice_mismatch");
        if (p.entries.size() >= MAX_ENTRIES) return #err("e_entries_full");

        if (p.lockNames) {
          switch (ownerOfName(p, name)) {
            case (?first) { if (not Principal.equal(first, msg.caller)) return #err("e_name_locked") };
            case null {};
          };
        };

        let record : Record = { name; comment; choices; at = now; by = msg.caller };
        save({ p with entries = Array.append(p.entries, [record]) });
        #ok();
      };
    };
  };

  /// 自分がこの端末から書いた回答を消す。
  /// 名前を間違えた・もう関わりたくない、という当たり前の要求に応えるためのもので、
  /// 締め切り後でも消せる（自分の書いたものは自分で引き取れる、という考え方）。
  public shared (msg) func withdrawAnswer(id : Text, name : Text) : async Result.Result<(), Text> {
    if (Principal.isAnonymous(msg.caller)) return #err("e_anonymous");

    switch (find id) {
      case null { #err("e_not_found") };
      case (?p) {
        let kept = Array.filter<Record>(
          p.entries,
          func(r : Record) : Bool {
            not (Principal.equal(r.by, msg.caller) and Text.equal(r.name, name));
          },
        );
        if (kept.size() == p.entries.size()) return #err("e_nothing_to_withdraw");
        save({ p with entries = kept });
        #ok();
      };
    };
  };

  // ---- 主催者の操作 --------------------------------------------------------

  public shared (msg) func setClosed(id : Text, closed : Bool) : async Result.Result<(), Text> {
    switch (find id) {
      case null { #err("e_not_found") };
      case (?p) {
        if (not Principal.equal(p.owner, msg.caller)) return #err("e_not_owner");
        save({ p with closed });
        #ok();
      };
    };
  };

  public shared (msg) func deletePoll(id : Text) : async Result.Result<(), Text> {
    switch (find id) {
      case null { #err("e_not_found") };
      case (?p) {
        if (not Principal.equal(p.owner, msg.caller)) return #err("e_not_owner");
        polls := Trie.remove(polls, textKey id, Text.equal).0;
        #ok();
      };
    };
  };

  // ---- 参照 ----------------------------------------------------------------

  public shared query (msg) func getPoll(id : Text) : async ?PollView {
    switch (find id) {
      case null { null };
      case (?p) { ?view(p, msg.caller, Time.now()) };
    };
  };

  /// 残りの燃料と、1 日あたりの減り。支援ページで「あと何年ぶん」を出すために使う。
  /// 自分の状態は自分で読める。ページを配る側の状態も読めるよう、controller に入れてある。
  public func fuel() : async Fuel {
    let self = await IC.canister_status({ canister_id = Principal.fromActor(Kimaru) });
    let page = try {
      ?(await IC.canister_status({ canister_id = Principal.fromText(FRONTEND_ID) }));
    } catch (_) {
      null; // 読めないときは黙って省く（表示側で「—」にする）
    };
    {
      dataCycles = self.cycles;
      dataPerDay = self.idle_cycles_burned_per_day;
      pageCycles = switch (page) { case (?p) { ?p.cycles }; case null { null } };
      pagePerDay = switch (page) { case (?p) { ?p.idle_cycles_burned_per_day }; case null { null } };
    };
  };

  public query func health() : async Health {
    var entries = 0;
    for ((_, p) in Trie.iter(polls)) { entries += p.entries.size() };
    {
      polls = Trie.size(polls);
      entries;
      createdTotal;
      cycles = Cycles.balance();
      legacyCount;
    };
  };

  // ---- 燃料の読み取り ------------------------------------------------------

  // ---- 前身のカウンター（フッターに小さく残してある） ----------------------

  public func increment() : async Nat {
    legacyCount += 1;
    legacyCount;
  };

  public query func getCount() : async Nat { legacyCount };

  // ---- 支援（cycles の受け取り） ------------------------------------------

  /// ウォレットキャニスターから送られた cycles を受け取る。
  /// dfx wallet send / NNS などから呼ばれる標準的な入り口。
  public func wallet_receive() : async { accepted : Nat } {
    let available = Cycles.available();
    let accepted = Cycles.accept<system>(available);
    { accepted };
  };
};
