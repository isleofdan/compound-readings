import { useState, useMemo, useCallback } from "react";

// ─── Data ───────────────────────────────────────────────────────────────────
const ENTRIES = [
  // ── 音音 ──
  { id:"on01", compound:"学校", reading:"がっこう", chars:[{k:"学",r:"がっ",t:"on"},{k:"校",r:"こう",t:"on"}], cls:"on_on", diff:1, changes:["促音"], changeDetail:"ガク+コウ→がっこう", context:"Universal anchor", trap:null, chains:["学"] },
  { id:"on02", compound:"会議", reading:"かいぎ", chars:[{k:"会",r:"かい",t:"on"},{k:"議",r:"ぎ",t:"on"}], cls:"on_on", diff:1, changes:[], changeDetail:null, context:"Business meetings — daily encounter", trap:null, chains:["会"] },
  { id:"on03", compound:"職場", reading:"しょくば", chars:[{k:"職",r:"しょく",t:"on"},{k:"場",r:"ば",t:"on"}], cls:"on_on", diff:2, changes:[], changeDetail:null, context:"Workplace — 'うちの職場では…'", trap:"場=ば looks like kun but is a contracted on reading (ジョウ→ば is debated). Compare 場所, 立場.", chains:["場","職"] },
  { id:"on04", compound:"場面", reading:"ばめん", chars:[{k:"場",r:"ば",t:"on"},{k:"面",r:"めん",t:"on"}], cls:"on_on", diff:2, changes:[], changeDetail:null, context:"Describing scenes — '感動的な場面'", trap:"Same 場=ば as 職場. Both on_on despite ば sounding native.", chains:["場"] },
  { id:"on05", compound:"毎日", reading:"まいにち", chars:[{k:"毎",r:"まい",t:"on"},{k:"日",r:"にち",t:"on"}], cls:"on_on", diff:1, changes:[], changeDetail:null, context:"Daily life — highest frequency time compound", trap:"毎=マイ is always on. 日=ニチ is on here. Compare 毎朝 where 朝=あさ is kun → 重箱.", chains:["毎","日"] },
  { id:"on06", compound:"毎晩", reading:"まいばん", chars:[{k:"毎",r:"まい",t:"on"},{k:"晩",r:"ばん",t:"on"}], cls:"on_on", diff:1, changes:[], changeDetail:null, context:"'毎晩遅くまで仕事する'", trap:"晩 has no common kun reading → forces 音音 with 毎.", chains:["毎"] },
  { id:"on07", compound:"散歩", reading:"さんぽ", chars:[{k:"散",r:"さん",t:"on"},{k:"歩",r:"ぽ",t:"on"}], cls:"on_on", diff:2, changes:["半濁音"], changeDetail:"サン+ホ→さんぽ (ン+ハ行→パ行)", context:"Daily walks — '散歩に行きましょう'", trap:"歩=ホ→ポ via nasal assimilation. Same pattern as 年俸, 心配.", chains:[] },
  { id:"on08", compound:"施行", reading:"しこう", chars:[{k:"施",r:"し",t:"on"},{k:"行",r:"こう",t:"on"}], cls:"on_on", diff:3, altReadings:[{reading:"せこう",cls:"on_on",note:"Construction usage, spreading to legal"},{reading:"せぎょう",cls:"on_on",note:"Buddhist — giving alms"}], changes:[], changeDetail:null, context:"Legal: '法律の施行日'. Construction: '工事を施行する'", trap:"Live reading shift. NHK prescribes しこう for law. Construction uses せこう universally. The split is eroding.", chains:["行"] },
  { id:"on09", compound:"代替", reading:"だいたい", chars:[{k:"代",r:"だい",t:"on"},{k:"替",r:"たい",t:"on"}], cls:"on_on", diff:3, altReadings:[{reading:"だいがえ",cls:"juubako",note:"Increasingly common in business/media — changes classification"}], changes:[], changeDetail:null, context:"Business: '代替案を出してください'", trap:"だいがえ reclassifies it as 重箱. A compound whose classification is actively shifting.", chains:["代"] },
  { id:"on10", compound:"出納", reading:"すいとう", chars:[{k:"出",r:"すい",t:"on"},{k:"納",r:"とう",t:"on"}], cls:"on_on", diff:4, changes:[], changeDetail:null, context:"Finance: '出納帳' (cash book), '出納係' (cashier/treasurer)", trap:"Both are archaic on readings (呉音). 出=スイ and 納=トウ are not the readings learners know. Classification is correct but unpredictive — you just have to know this one.", chains:["出"] },
  { id:"on11", compound:"朝食", reading:"ちょうしょく", chars:[{k:"朝",r:"ちょう",t:"on"},{k:"食",r:"しょく",t:"on"}], cls:"on_on", diff:1, changes:[], changeDetail:null, context:"Hotels, formal dining — 'ご朝食は7時から'", trap:"Formal register forces 音音. Compare 朝飯(あさめし, 訓訓) for casual. 朝 switches between チョウ(on) and あさ(kun) based on register.", chains:["朝","食"] },
  { id:"on12", compound:"夕食", reading:"ゆうしょく", chars:[{k:"夕",r:"ゆう",t:"kun"},{k:"食",r:"しょく",t:"on"}], cls:"juubako", diff:2, changes:[], changeDetail:null, context:"Hotels, formal settings — 'ご夕食の時間です'", trap:"夕=ゆう is ALWAYS kun (no standard on reading in common use). Even in formal 夕食, it stays kun → 重箱. Breaks the 'formal=音音' heuristic that works for 朝.", chains:["夕","食"] },

  // ── 訓訓 ──
  { id:"kun01", compound:"山道", reading:"やまみち", chars:[{k:"山",r:"やま",t:"kun"},{k:"道",r:"みち",t:"kun"}], cls:"kun_kun", diff:1, changes:[], changeDetail:null, context:"Hiking, travel — '山道は険しい'", trap:null, chains:["山","道"] },
  { id:"kun02", compound:"手紙", reading:"てがみ", chars:[{k:"手",r:"て",t:"kun"},{k:"紙",r:"がみ",t:"kun"}], cls:"kun_kun", diff:1, changes:["連濁"], changeDetail:"かみ→がみ", context:"Letter writing — still used despite digital age", trap:"手=て is kun. Compare 手本(てほん, 湯桶) where same て pairs with on reading.", chains:["手"] },
  { id:"kun03", compound:"手間", reading:"てま", chars:[{k:"手",r:"て",t:"kun"},{k:"間",r:"ま",t:"kun"}], cls:"kun_kun", diff:2, changes:[], changeDetail:null, context:"Effort/labor — '手間がかかる'", trap:"手=て(kun) + 間=ま(kun). Compare 時間(じかん, 音音) where 間=カン is on.", chains:["手","間"] },
  { id:"kun04", compound:"焼鳥", reading:"やきとり", chars:[{k:"焼",r:"やき",t:"kun"},{k:"鳥",r:"とり",t:"kun"}], cls:"kun_kun", diff:1, changes:[], changeDetail:null, context:"Izakaya staple — menu reading", trap:"焼=やき(kun) + 鳥=とり(kun) → 訓訓. Compare 焼肉(やきにく) where 肉=ニク is on → 湯桶. Same first element, different classification.", chains:["焼"] },
  { id:"kun05", compound:"朝飯", reading:"あさめし", chars:[{k:"朝",r:"あさ",t:"kun"},{k:"飯",r:"めし",t:"kun"}], cls:"kun_kun", diff:2, changes:[], changeDetail:null, context:"Casual breakfast — 'まだ朝飯食ってない'", trap:"Casual register → 訓訓. Compare 朝食(ちょうしょく, 音音). The 朝 character is a register switch: formal=チョウ, casual=あさ.", chains:["朝","飯"] },
  { id:"kun06", compound:"夕飯", reading:"ゆうはん", chars:[{k:"夕",r:"ゆう",t:"kun"},{k:"飯",r:"はん",t:"on"}], cls:"juubako", diff:2, changes:[], changeDetail:null, context:"Casual dinner — 'もう夕飯食べた？'", trap:"Wait — 飯=はん is ON here, not kun (めし). So 夕飯 is actually 重箱(kun+on), not 訓訓. The 夕食/夕飯 pair BOTH end up as 重箱 because 夕 is always kun.", chains:["夕","飯"] },
  { id:"kun07", compound:"立場", reading:"たちば", chars:[{k:"立",r:"たち",t:"kun"},{k:"場",r:"ば",t:"on"}], cls:"yutou", diff:2, changes:[], changeDetail:null, context:"'相手の立場になって考える'", trap:"場=ば is on (contracted from ジョウ). Makes this 湯桶, not 訓訓 as it sounds.", chains:["場","立"] },
  { id:"kun08", compound:"若葉", reading:"わかば", chars:[{k:"若",r:"わか",t:"kun"},{k:"葉",r:"ば",t:"kun"}], cls:"kun_kun", diff:1, changes:["連濁"], changeDetail:"は→ば", context:"Seasonal language, driving (若葉マーク)", trap:"Both kun. Compare 新芽(しんめ, 重箱) — both mean 'new growth' but 新 is on and 若 is kun.", chains:[] },
  { id:"kun09", compound:"物語", reading:"ものがたり", chars:[{k:"物",r:"もの",t:"kun"},{k:"語",r:"がたり",t:"kun"}], cls:"kun_kun", diff:1, changes:["連濁"], changeDetail:"かたり→がたり", context:"Literature, storytelling — '源氏物語'", trap:null, chains:[] },

  // ── 重箱読み (juubako: on+kun) ──
  { id:"jb01", compound:"本棚", reading:"ほんだな", chars:[{k:"本",r:"ほん",t:"on"},{k:"棚",r:"だな",t:"kun"}], cls:"juubako", diff:1, changes:["連濁"], changeDetail:"たな→だな", context:"Bookshelf — furniture shopping, home organization", trap:"Classic anchor for 重箱. 本=ホン(on) + 棚=たな(kun with 連濁).", chains:["本"] },
  { id:"jb02", compound:"本場", reading:"ほんば", chars:[{k:"本",r:"ほん",t:"on"},{k:"場",r:"ば",t:"on"}], cls:"on_on", diff:2, changes:[], changeDetail:null, context:"'本場の味' — the authentic/original version", trap:"Looks like 重箱 (same 本+場 pattern as 本棚) but 場=ば is on. Both elements are on → 音音.", chains:["本","場"] },
  { id:"jb03", compound:"毎朝", reading:"まいあさ", chars:[{k:"毎",r:"まい",t:"on"},{k:"朝",r:"あさ",t:"kun"}], cls:"juubako", diff:1, changes:[], changeDetail:null, context:"Daily routine — '毎朝6時に起きる'", trap:"毎=マイ(on) + 朝=あさ(kun) → 重箱. Compare 毎日(音音) and 毎晩(音音). In the 毎X system, the second character determines classification.", chains:["毎","朝"] },
  { id:"jb04", compound:"毎月", reading:"まいつき", chars:[{k:"毎",r:"まい",t:"on"},{k:"月",r:"つき",t:"kun"}], cls:"juubako", diff:2, altReadings:[{reading:"まいげつ",cls:"on_on",note:"More formal. Written/business: '毎月の報告書'"}], changes:[], changeDetail:null, context:"Scheduling, finance — '毎月25日が給料日'", trap:"Dual reading that changes classification. まいつき=重箱, まいげつ=音音. The 毎X system: kun second char→重箱, on second char→音音.", chains:["毎","月"] },
  { id:"jb05", compound:"新芽", reading:"しんめ", chars:[{k:"新",r:"しん",t:"on"},{k:"芽",r:"め",t:"kun"}], cls:"juubako", diff:2, changes:[], changeDetail:null, context:"Gardening, cooking (tea), seasonal language", trap:"Illustrates the 重箱 semantic pattern: Sino-Japanese modifier + native concrete noun. Compare 若葉(わかば, 訓訓).", chains:["新"] },
  { id:"jb06", compound:"茶畑", reading:"ちゃばたけ", chars:[{k:"茶",r:"ちゃ",t:"on"},{k:"畑",r:"ばたけ",t:"kun"}], cls:"juubako", diff:2, changes:["連濁"], changeDetail:"はたけ→ばたけ", context:"Travel (Shizuoka, Uji), food culture", trap:"茶 has only on readings (imported concept). 畑 is a 国字 — only kun. They can ONLY form 重箱.", chains:["茶"] },
  { id:"jb07", compound:"役場", reading:"やくば", chars:[{k:"役",r:"やく",t:"on"},{k:"場",r:"ば",t:"on"}], cls:"on_on", diff:2, changes:[], changeDetail:null, context:"Town hall — '役場に届けを出す'", trap:"Another 場 chain entry. 場=ば is on → 音音, not 重箱.", chains:["場","役"] },
  { id:"jb08", compound:"番組", reading:"ばんぐみ", chars:[{k:"番",r:"ばん",t:"on"},{k:"組",r:"ぐみ",t:"kun"}], cls:"juubako", diff:1, changes:["連濁"], changeDetail:"くみ→ぐみ", context:"TV programs — 'この番組面白い'", trap:null, chains:[] },

  // ── 湯桶読み (yutou: kun+on) ──
  { id:"yt01", compound:"場所", reading:"ばしょ", chars:[{k:"場",r:"ば",t:"on"},{k:"所",r:"しょ",t:"on"}], cls:"on_on", diff:2, changes:[], changeDetail:null, context:"Location — universally common", trap:"場=ば is on (ジョウ contracted). This is 音音, not 湯桶 despite appearances. The 場 chain's signature trap.", chains:["場","所"] },
  { id:"yt02", compound:"手本", reading:"てほん", chars:[{k:"手",r:"て",t:"kun"},{k:"本",r:"ほん",t:"on"}], cls:"yutou", diff:2, changes:[], changeDetail:null, context:"Model/example — 'お手本を見せて'", trap:"手=て(kun) + 本=ホン(on) → 湯桶. Same 手=て as in 手紙(訓訓). The 手 chain: classification depends entirely on the second element.", chains:["手","本"] },
  { id:"yt03", compound:"手帳", reading:"てちょう", chars:[{k:"手",r:"て",t:"kun"},{k:"帳",r:"ちょう",t:"on"}], cls:"yutou", diff:1, changes:[], changeDetail:null, context:"Notebook/planner — 'スケジュール手帳'", trap:"Another 手 chain entry. 手=て(kun) + 帳=チョウ(on) → 湯桶.", chains:["手"] },
  { id:"yt04", compound:"手数", reading:"てすう", chars:[{k:"手",r:"て",t:"kun"},{k:"数",r:"すう",t:"on"}], cls:"yutou", diff:2, changes:[], changeDetail:null, context:"Trouble/fee — 'お手数ですが…' (polite request)", trap:"手=て(kun)+数=スウ(on)→湯桶. In the 手 chain: when second char is on → 湯桶. When kun → 訓訓.", chains:["手","数"] },
  { id:"yt05", compound:"焼肉", reading:"やきにく", chars:[{k:"焼",r:"やき",t:"kun"},{k:"肉",r:"にく",t:"on"}], cls:"yutou", diff:2, changes:[], changeDetail:null, context:"Restaurants — menu reading, '焼肉屋'", trap:"焼=やき(kun)+肉=ニク(on)→湯桶. Compare 焼鳥(やきとり, 訓訓). Same 焼=やき, different classification because 鳥=kun but 肉=on.", chains:["焼"] },
  { id:"yt06", compound:"見本", reading:"みほん", chars:[{k:"見",r:"み",t:"kun"},{k:"本",r:"ほん",t:"on"}], cls:"yutou", diff:1, changes:[], changeDetail:null, context:"Sample — 'お見本をお願いします'", trap:null, chains:["本","見"] },
  { id:"yt07", compound:"雨具", reading:"あまぐ", chars:[{k:"雨",r:"あま",t:"kun"},{k:"具",r:"ぐ",t:"on"}], cls:"yutou", diff:2, changes:["連濁"], changeDetail:"グ is already voiced but あま is the kun-form of 雨", context:"Rain gear — practical vocabulary", trap:null, chains:[] },

  // ── 熟字訓 / irregular ──
  { id:"jk01", compound:"大人", reading:"おとな", chars:[{k:"大",r:"—",t:"—"},{k:"人",r:"—",t:"—"}], cls:"jukujikun", diff:2, changes:[], changeDetail:null, context:"Universal — but the reading is completely irregular", trap:"大=おお/ダイ, 人=ひと/ジン/ニン — none combine to おとな. Whole-word reading. Decomposition fails.", chains:["人"] },
  { id:"jk02", compound:"昨日", reading:"きのう", chars:[{k:"昨",r:"—",t:"—"},{k:"日",r:"—",t:"—"}], cls:"jukujikun", diff:2, altReadings:[{reading:"さくじつ",cls:"on_on",note:"Formal/literary. News, legal documents."}], changes:[], changeDetail:null, context:"Daily conversation. Formal さくじつ in news/legal.", trap:"きのう is 熟字訓. さくじつ is standard 音音. Register determines which reading system applies.", chains:["日"] },
  { id:"jk03", compound:"今日", reading:"きょう", chars:[{k:"今",r:"—",t:"—"},{k:"日",r:"—",t:"—"}], cls:"jukujikun", diff:1, altReadings:[{reading:"こんにち",cls:"on_on",note:"Formal/set phrases: 今日は(こんにちは)"}], changes:[], changeDetail:null, context:"Universal. こんにち appears in greetings and formal speech.", trap:"Time-word trio: 昨日/今日/明日 are all 熟字訓 in casual use, all 音音 in formal.", chains:["日","今"] },
  { id:"jk04", compound:"明日", reading:"あした", chars:[{k:"明",r:"—",t:"—"},{k:"日",r:"—",t:"—"}], cls:"jukujikun", diff:2, altReadings:[{reading:"あす",cls:"jukujikun",note:"Slightly more formal than あした"},{reading:"みょうにち",cls:"on_on",note:"Formal/business"}], changes:[], changeDetail:null, context:"Daily conversation. みょうにち in business/formal.", trap:"Three readings: あした(casual 熟字訓), あす(mid-register 熟字訓), みょうにち(formal 音音).", chains:["日","明"] },
  { id:"jk05", compound:"素人", reading:"しろうと", chars:[{k:"素",r:"—",t:"—"},{k:"人",r:"—",t:"—"}], cls:"jukujikun", diff:3, changes:[], changeDetail:null, context:"Amateur/layperson — '素人にはわからない'", trap:"Person-word 熟字訓 set: 大人/素人/玄人/仲人. All irregular readings of X人.", chains:["人"] },
  { id:"jk06", compound:"梅雨", reading:"つゆ", chars:[{k:"梅",r:"—",t:"—"},{k:"雨",r:"—",t:"—"}], cls:"jukujikun", diff:2, altReadings:[{reading:"ばいう",cls:"on_on",note:"Meteorological/formal: '梅雨前線'(ばいうぜんせん)"}], changes:[], changeDetail:null, context:"Rainy season — essential seasonal vocabulary", trap:"つゆ is 熟字訓 in daily use. ばいう appears in compound terms like 梅雨前線.", chains:[] },
  { id:"jk07", compound:"土産", reading:"みやげ", chars:[{k:"土",r:"—",t:"—"},{k:"産",r:"—",t:"—"}], cls:"jukujikun", diff:2, changes:[], changeDetail:null, context:"Souvenirs — 'お土産を買う'. Tourism, business gifts.", trap:"お土産(おみやげ) is universal. 土=ド/つち, 産=サン/うむ — neither contributes to みやげ.", chains:[] },
];

// ─── Derived indexes ────────────────────────────────────────────────────────
const CLS_LABELS = {
  on_on: { label:"音音", en:"On-On", color:"#4A7C59" },
  kun_kun: { label:"訓訓", en:"Kun-Kun", color:"#8B5E3C" },
  juubako: { label:"重箱", en:"Jūbako (on+kun)", color:"#5B6FA8" },
  yutou: { label:"湯桶", en:"Yutō (kun+on)", color:"#9B5A8C" },
  jukujikun: { label:"熟字訓", en:"Jukujikun", color:"#B8860B" },
};

function buildChainIndex(entries) {
  const chains = {};
  entries.forEach(e => {
    (e.chains || []).forEach(ch => {
      if (!chains[ch]) chains[ch] = [];
      chains[ch].push(e);
    });
  });
  return Object.entries(chains)
    .filter(([,v]) => v.length >= 3)
    .sort((a,b) => b[1].length - a[1].length)
    .map(([kanji, items]) => ({
      kanji,
      count: items.length,
      classifications: [...new Set(items.map(i => i.cls))],
      entries: items,
    }));
}

// ─── Utility ────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Components ─────────────────────────────────────────────────────────────

function ClassBadge({ cls, size = "md" }) {
  const info = CLS_LABELS[cls];
  if (!info) return null;
  const sz = size === "sm" ? "0.7rem" : "0.85rem";
  const pad = size === "sm" ? "2px 7px" : "4px 10px";
  return (
    <span style={{
      display:"inline-block", background:info.color, color:"#fff",
      borderRadius:12, padding:pad, fontSize:sz, fontWeight:600,
      letterSpacing:"0.02em", lineHeight:1.3,
    }}>
      {info.label}
    </span>
  );
}

function EntryCard({ entry, revealed, onReveal, showClassification = true }) {
  return (
    <div style={{
      background:"#1a1a2e", borderRadius:16, padding:"20px 18px",
      marginBottom:12, border:"1px solid #2a2a4a",
    }}>
      <div style={{ textAlign:"center", marginBottom:revealed ? 14 : 0 }}>
        <div style={{
          fontSize:"2.4rem", fontWeight:700, color:"#e8e6e3",
          letterSpacing:"0.15em", fontFamily:"'Noto Serif JP', serif",
        }}>
          {entry.compound}
        </div>
        {revealed && (
          <div style={{
            fontSize:"1.3rem", color:"#b8c0e0", marginTop:4,
            fontFamily:"'Noto Sans JP', sans-serif",
          }}>
            {entry.reading}
          </div>
        )}
      </div>

      {revealed && (
        <div style={{ marginTop:12 }}>
          {showClassification && (
            <div style={{ textAlign:"center", marginBottom:10 }}>
              <ClassBadge cls={entry.cls} />
              {entry.altReadings && entry.altReadings.map((ar, i) => (
                <span key={i} style={{ marginLeft:6 }}>
                  <ClassBadge cls={ar.cls} size="sm" />
                  <span style={{ color:"#888", fontSize:"0.75rem", marginLeft:4 }}>{ar.reading}</span>
                </span>
              ))}
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom:10, flexWrap:"wrap" }}>
            {entry.chars.map((c, i) => (
              <div key={i} style={{
                background:"#12121f", borderRadius:10, padding:"8px 14px",
                textAlign:"center", minWidth:70,
              }}>
                <div style={{ fontSize:"1.4rem", color:"#e8e6e3", fontFamily:"'Noto Serif JP', serif" }}>{c.k}</div>
                <div style={{ fontSize:"0.85rem", color:"#b8c0e0" }}>{c.r}</div>
                <div style={{
                  fontSize:"0.7rem", marginTop:2,
                  color: c.t === "on" ? "#6BC5A0" : c.t === "kun" ? "#D4A574" : "#999",
                  fontWeight:600,
                }}>
                  {c.t === "on" ? "音" : c.t === "kun" ? "訓" : "—"}
                </div>
              </div>
            ))}
          </div>

          {entry.changes && entry.changes.length > 0 && (
            <div style={{
              fontSize:"0.78rem", color:"#8888bb", textAlign:"center", marginBottom:6,
              fontStyle:"italic",
            }}>
              {entry.changeDetail || entry.changes.join(", ")}
            </div>
          )}

          {entry.trap && (
            <div style={{
              fontSize:"0.8rem", color:"#c8b880", background:"#1f1f30",
              borderRadius:8, padding:"8px 12px", marginTop:8,
              borderLeft:"3px solid #c8b880",
            }}>
              {entry.trap}
            </div>
          )}
        </div>
      )}

      {!revealed && (
        <div style={{ textAlign:"center", marginTop:12 }}>
          <button onClick={onReveal} style={{
            background:"#2a2a4a", color:"#b8c0e0", border:"1px solid #3a3a5a",
            borderRadius:10, padding:"10px 28px", fontSize:"0.95rem",
            cursor:"pointer", touchAction:"manipulation",
          }}>
            Reveal
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mode: Chain Explorer ───────────────────────────────────────────────────
function ChainExplorer({ chainIndex }) {
  const [selectedChain, setSelectedChain] = useState(null);
  const [revealedIds, setRevealedIds] = useState({});
  const [revealAll, setRevealAll] = useState(false);

  const chain = selectedChain !== null ? chainIndex[selectedChain] : null;

  if (!chain) {
    return (
      <div>
        <p style={{ color:"#999", fontSize:"0.85rem", marginBottom:16, lineHeight:1.5 }}>
          Explore how a single kanji shifts between 音 and 訓 across compounds. 
          This is where classification becomes prediction skill.
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {chainIndex.map((ch, i) => (
            <button key={ch.kanji} onClick={() => { setSelectedChain(i); setRevealedIds({}); setRevealAll(false); }} style={{
              background:"#1a1a2e", border:"1px solid #2a2a4a", borderRadius:12,
              padding:"12px 16px", cursor:"pointer", touchAction:"manipulation",
              textAlign:"left", minWidth:100, flex:"1 1 45%",
            }}>
              <div style={{ fontSize:"1.8rem", color:"#e8e6e3", fontFamily:"'Noto Serif JP', serif" }}>{ch.kanji}</div>
              <div style={{ fontSize:"0.78rem", color:"#888", marginTop:4 }}>
                {ch.count} compounds · {ch.classifications.length} types
              </div>
              <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
                {ch.classifications.map(c => <ClassBadge key={c} cls={c} size="sm" />)}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <button onClick={() => { setSelectedChain(null); setRevealedIds({}); setRevealAll(false); }} style={{
          background:"none", border:"none", color:"#6BC5A0", fontSize:"0.9rem",
          cursor:"pointer", padding:"4px 0", touchAction:"manipulation",
        }}>
          ← Back
        </button>
        <button onClick={() => setRevealAll(!revealAll)} style={{
          background:"#2a2a4a", color:"#b8c0e0", border:"1px solid #3a3a5a",
          borderRadius:8, padding:"6px 14px", fontSize:"0.8rem",
          cursor:"pointer", touchAction:"manipulation",
        }}>
          {revealAll ? "Hide all" : "Reveal all"}
        </button>
      </div>

      <div style={{ textAlign:"center", marginBottom:16 }}>
        <span style={{
          fontSize:"2.2rem", color:"#e8e6e3", fontFamily:"'Noto Serif JP', serif",
        }}>{chain.kanji}</span>
        <span style={{ color:"#888", fontSize:"0.85rem", marginLeft:10 }}>
          {chain.count} compounds
        </span>
      </div>

      {chain.entries.map(e => (
        <EntryCard
          key={e.id}
          entry={e}
          revealed={revealAll || !!revealedIds[e.id]}
          onReveal={() => setRevealedIds(prev => ({...prev, [e.id]: true}))}
        />
      ))}
    </div>
  );
}

// ─── Mode: Classification Drill ─────────────────────────────────────────────
function ClassificationDrill({ entries }) {
  const [queue, setQueue] = useState(() => shuffle(entries));
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [stats, setStats] = useState({ correct:0, total:0 });

  const current = queue[idx];

  const handleChoice = (cls) => {
    setChosen(cls);
    setStats(prev => ({
      correct: prev.correct + (cls === current.cls ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNext = () => {
    setChosen(null);
    if (idx + 1 >= queue.length) {
      setQueue(shuffle(entries));
      setIdx(0);
    } else {
      setIdx(idx + 1);
    }
  };

  const handleReset = () => {
    setQueue(shuffle(entries));
    setIdx(0);
    setChosen(null);
    setStats({ correct:0, total:0 });
  };

  if (!current) return null;

  const isCorrect = chosen === current.cls;

  return (
    <div>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:14, fontSize:"0.8rem", color:"#888",
      }}>
        <span>{idx + 1} / {queue.length}</span>
        <span>
          {stats.total > 0 && `${stats.correct}/${stats.total} (${Math.round(stats.correct/stats.total*100)}%)`}
        </span>
        <button onClick={handleReset} style={{
          background:"none", border:"1px solid #3a3a5a", color:"#888",
          borderRadius:6, padding:"3px 10px", fontSize:"0.75rem",
          cursor:"pointer", touchAction:"manipulation",
        }}>Reset</button>
      </div>

      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{
          fontSize:"2.8rem", fontWeight:700, color:"#e8e6e3",
          fontFamily:"'Noto Serif JP', serif", letterSpacing:"0.15em",
        }}>
          {current.compound}
        </div>
        <div style={{ fontSize:"1.1rem", color:"#b8c0e0", marginTop:4 }}>
          {current.reading}
        </div>
      </div>

      {chosen === null ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {Object.entries(CLS_LABELS).map(([key, info]) => (
            <button key={key} onClick={() => handleChoice(key)} style={{
              background:"#1a1a2e", border:"2px solid #2a2a4a", borderRadius:12,
              padding:"14px 10px", cursor:"pointer", touchAction:"manipulation",
              textAlign:"center",
            }}>
              <div style={{ fontSize:"1.2rem", color:"#e8e6e3", fontWeight:600 }}>{info.label}</div>
              <div style={{ fontSize:"0.72rem", color:"#888", marginTop:2 }}>{info.en}</div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{
            textAlign:"center", marginBottom:14, padding:"10px 16px",
            borderRadius:10,
            background: isCorrect ? "#1a2e1a" : "#2e1a1a",
            border: isCorrect ? "1px solid #4A7C59" : "1px solid #7C4A4A",
          }}>
            <div style={{
              fontSize:"1.1rem", fontWeight:600,
              color: isCorrect ? "#6BC5A0" : "#D47474",
            }}>
              {isCorrect ? "Correct" : "Not quite"}
            </div>
            {!isCorrect && (
              <div style={{ fontSize:"0.85rem", color:"#ccc", marginTop:4 }}>
                You chose {CLS_LABELS[chosen]?.label} — it's {CLS_LABELS[current.cls]?.label}
              </div>
            )}
          </div>

          <EntryCard entry={current} revealed={true} onReveal={() => {}} />

          <div style={{ textAlign:"center", marginTop:14 }}>
            <button onClick={handleNext} style={{
              background:"#4A7C59", color:"#fff", border:"none",
              borderRadius:10, padding:"12px 36px", fontSize:"1rem",
              fontWeight:600, cursor:"pointer", touchAction:"manipulation",
            }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mode: Prediction Challenge ─────────────────────────────────────────────
function PredictionChallenge({ entries }) {
  const predictable = useMemo(() => entries.filter(e => e.cls !== "jukujikun"), [entries]);
  const [queue, setQueue] = useState(() => shuffle(predictable));
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("hint"); // hint → guess → revealed
  const [stats, setStats] = useState({ correct:0, total:0 });

  const current = queue[idx];

  const handleSelfScore = (correct) => {
    setStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
    setPhase("revealed");
  };

  const handleNext = () => {
    setPhase("hint");
    if (idx + 1 >= queue.length) {
      setQueue(shuffle(predictable));
      setIdx(0);
    } else {
      setIdx(idx + 1);
    }
  };

  const handleReset = () => {
    setQueue(shuffle(predictable));
    setIdx(0);
    setPhase("hint");
    setStats({ correct:0, total:0 });
  };

  if (!current) return null;

  return (
    <div>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:14, fontSize:"0.8rem", color:"#888",
      }}>
        <span>{idx + 1} / {queue.length}</span>
        <span>
          {stats.total > 0 && `${stats.correct}/${stats.total} (${Math.round(stats.correct/stats.total*100)}%)`}
        </span>
        <button onClick={handleReset} style={{
          background:"none", border:"1px solid #3a3a5a", color:"#888",
          borderRadius:6, padding:"3px 10px", fontSize:"0.75rem",
          cursor:"pointer", touchAction:"manipulation",
        }}>Reset</button>
      </div>

      <div style={{ textAlign:"center", marginBottom:12 }}>
        <div style={{
          fontSize:"2.8rem", fontWeight:700, color:"#e8e6e3",
          fontFamily:"'Noto Serif JP', serif", letterSpacing:"0.15em",
        }}>
          {current.compound}
        </div>

        <div style={{ marginTop:10 }}>
          <ClassBadge cls={current.cls} />
        </div>

        <p style={{ color:"#999", fontSize:"0.8rem", marginTop:8, fontStyle:"italic" }}>
          Given the classification, predict the reading
        </p>
      </div>

      {phase === "hint" && (
        <div style={{ textAlign:"center" }}>
          <div style={{
            display:"flex", justifyContent:"center", gap:16, marginBottom:16,
          }}>
            {current.chars.map((c, i) => (
              <div key={i} style={{
                background:"#1a1a2e", borderRadius:10, padding:"10px 18px",
                textAlign:"center", border:"1px solid #2a2a4a",
              }}>
                <div style={{ fontSize:"1.5rem", color:"#e8e6e3", fontFamily:"'Noto Serif JP', serif" }}>{c.k}</div>
                <div style={{
                  fontSize:"0.75rem", marginTop:4,
                  color: c.t === "on" ? "#6BC5A0" : "#D4A574",
                  fontWeight:600,
                }}>
                  {c.t === "on" ? "音読み" : "訓読み"}
                </div>
                <div style={{ fontSize:"0.7rem", color:"#666", marginTop:2 }}>
                  {c.t === "on" && c.k !== "—"
                    ? `音: ${(entries.find(x => x.chars.some(ch => ch.k === c.k))?.chars.find(ch => ch.k === c.k)?.on_readings || []).join(", ") || "?"}`
                    : ""}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setPhase("guess")} style={{
            background:"#5B6FA8", color:"#fff", border:"none",
            borderRadius:10, padding:"12px 32px", fontSize:"1rem",
            fontWeight:600, cursor:"pointer", touchAction:"manipulation",
          }}>
            I have my guess
          </button>
        </div>
      )}

      {phase === "guess" && (
        <div style={{ textAlign:"center" }}>
          <div style={{
            fontSize:"1.5rem", color:"#b8c0e0", marginBottom:16,
            fontFamily:"'Noto Sans JP', sans-serif",
          }}>
            {current.reading}
          </div>

          <p style={{ color:"#999", fontSize:"0.85rem", marginBottom:14 }}>Did you get it right?</p>

          <div style={{ display:"flex", justifyContent:"center", gap:12 }}>
            <button onClick={() => handleSelfScore(true)} style={{
              background:"#1a2e1a", color:"#6BC5A0", border:"1px solid #4A7C59",
              borderRadius:10, padding:"10px 28px", fontSize:"0.95rem",
              cursor:"pointer", touchAction:"manipulation",
            }}>
              ✓ Yes
            </button>
            <button onClick={() => handleSelfScore(false)} style={{
              background:"#2e1a1a", color:"#D47474", border:"1px solid #7C4A4A",
              borderRadius:10, padding:"10px 28px", fontSize:"0.95rem",
              cursor:"pointer", touchAction:"manipulation",
            }}>
              ✗ No
            </button>
          </div>
        </div>
      )}

      {phase === "revealed" && (
        <div>
          <EntryCard entry={current} revealed={true} onReveal={() => {}} />
          <div style={{ textAlign:"center", marginTop:14 }}>
            <button onClick={handleNext} style={{
              background:"#4A7C59", color:"#fff", border:"none",
              borderRadius:10, padding:"12px 36px", fontSize:"1rem",
              fontWeight:600, cursor:"pointer", touchAction:"manipulation",
            }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────
const TABS = [
  { key:"chain", label:"Chain Explorer", icon:"🔗" },
  { key:"classify", label:"Classify", icon:"📋" },
  { key:"predict", label:"Predict", icon:"🎯" },
];

export default function App() {
  const [tab, setTab] = useState("chain");
  const chainIndex = useMemo(() => buildChainIndex(ENTRIES), []);

  return (
    <div style={{
      minHeight:"100vh", background:"#0f0f1a", color:"#e8e6e3",
      fontFamily:"'Noto Sans JP', -apple-system, sans-serif",
      maxWidth:480, margin:"0 auto",
    }}>
      {/* Header */}
      <div style={{
        padding:"16px 18px 10px", borderBottom:"1px solid #1a1a2e",
        textAlign:"center",
      }}>
        <h1 style={{
          fontSize:"1.1rem", fontWeight:700, margin:0, color:"#e8e6e3",
          letterSpacing:"0.05em",
        }}>
          複合語読み分けドリル
        </h1>
        <p style={{ fontSize:"0.72rem", color:"#666", margin:"4px 0 0" }}>
          Compound Reading Pattern Drill · {ENTRIES.length} entries
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display:"flex", borderBottom:"1px solid #1a1a2e",
        position:"sticky", top:0, background:"#0f0f1a", zIndex:10,
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex:1, padding:"10px 4px", background:"none",
            border:"none", borderBottom: tab === t.key ? "2px solid #6BC5A0" : "2px solid transparent",
            color: tab === t.key ? "#6BC5A0" : "#666",
            fontSize:"0.78rem", cursor:"pointer", touchAction:"manipulation",
            transition:"color 0.15s",
          }}>
            <span style={{ fontSize:"1rem" }}>{t.icon}</span>
            <br />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:"16px 14px 200px" }}>
        {tab === "chain" && <ChainExplorer chainIndex={chainIndex} />}
        {tab === "classify" && <ClassificationDrill entries={ENTRIES} />}
        {tab === "predict" && <PredictionChallenge entries={ENTRIES} />}
      </div>
    </div>
  );
}
