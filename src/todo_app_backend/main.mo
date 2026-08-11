// Nat 型をインポート (カウンターの型として使う)
import Nat "mo:base/Nat";

// シンプルなカウンター Actor
persistent actor CounterBackend {

    // カウンター値を保持する変数 (最初は 0)
    // stable を外しているので、アップグレードで値はリセットされます
    transient var count : Nat = 0;

    // カウンターを 1 増やす公開関数
    public func increment() : async () {
        count += 1; // count = count + 1 と同じ
    };

    // 現在のカウンター値を取得する公開クエリ関数 (状態を変更しない)
    public query func getCount() : async Nat {
        return count;
    };

};
