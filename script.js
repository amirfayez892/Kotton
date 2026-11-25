const DEFAULT_TYPES = [
 {
  "id": "builtin-sweatshirt",
  "name": "سويت شيرت أوفر سايز",
  "amount": 650,
  "desc": "سويت شيرت أوفر سايز مريح بتصميم بسيط. متاح في 11 لون.",
  "sizes": [
   "S",
   "M",
   "L",
   "XL"
  ],
  "soldOut": false,
  "colors": [
   {
    "name": "أزرق فاتح",
    "swatch": "#aed6f1",
    "image": "photos/s1.jpg"
   },
   {
    "name": "أحمر",
    "swatch": "#b03a2e",
    "image": "photos/s2.jpg"
   },
   {
    "name": "أبيض",
    "swatch": "#f2f3f4",
    "image": "photos/s3.jpg"
   },
   {
    "name": "أسود",
    "swatch": "#1b2631",
    "image": "photos/s4.jpg"
   },
   {
    "name": "أخضر غامق",
    "swatch": "#1e5631",
    "image": "photos/s5.jpg"
   },
   {
    "name": "كحلي",
    "swatch": "#1b2a4a",
    "image": "photos/s6.jpg"
   },
   {
    "name": "تركواز",
    "swatch": "#117a8b",
    "image": "photos/s7.jpg"
   },
   {
    "name": "رمادي غامق",
    "swatch": "#4d5656",
    "image": "photos/s8.jpg"
   },
   {
    "name": "عنابي",
    "swatch": "#7b241c",
    "image": "photos/s9.jpg"
   },
   {
    "name": "بيج",
    "swatch": "#e8dcc4",
    "image": "photos/s10.jpg"
   },
   {
    "name": "رمادي فاتح",
    "swatch": "#d5dbdb",
    "image": "photos/s11.jpg"
   }
  ]
 },
 {
  "id": "builtin-mohair",
  "name": "تريكو موهير",
  "amount": 849,
  "desc": "تريكو موهير ناعم ودافي. متاح في 5 ألوان.",
  "sizes": [
   "S",
   "M",
   "L",
   "XL"
  ],
  "soldOut": false,
  "colors": [
   {
    "name": "أزرق فاتح متدرج",
    "swatch": "linear-gradient(135deg,#d6eaf8,#85c1e9)",
    "image": "photos/k1.jpg"
   },
   {
    "name": "بينك متدرج",
    "swatch": "linear-gradient(135deg,#fadbd8,#ec7063)",
    "image": "photos/k2.jpg"
   },
   {
    "name": "رمادي",
    "swatch": "#5d6d7e",
    "image": "photos/k3.jpg"
   },
   {
    "name": "بني متدرج",
    "swatch": "linear-gradient(135deg,#a1887f,#4e342e)",
    "image": "photos/k4.jpg"
   },
   {
    "name": "عنابي",
    "swatch": "#7b1e3b",
    "image": "photos/k5.jpg"
   }
  ]
 }
];

const WA = "201031387379";
const FALLBACK_SIZES = ["S", "M", "L", "XL"];
const CART_KEY = "kotton_cart_v2";
let lastOrder = null;
let TYPES = [];

const grid = document.getElementById("grid");
const modal = document.getElementById("modal");
const mImg = document.getElementById("m-img");
const mName = document.getElementById("m-name");
const mPrice = document.getElementById("m-price");
const mDesc = document.getElementById("m-desc");
const mColor = document.getElementById("m-color");
const mAdd = document.getElementById("m-add");
const mOrder = document.getElementById("m-order");
const mSoldout = document.getElementById("m-soldout");
const szBox = document.getElementById("sizes");
const swBox = document.getElementById("swatches");
let selSize = null, selColor = 0;
let cur = null, lastCard = null;

const fmt = n => n + " جنيه";
const priceTxt = t => fmt(t.amount);
const colorCountTxt = n => n === 1 ? "لون واحد متاح" : n === 2 ? "لونين متاحين" : n + " ألوان متاحة";

/* ===== load products: Supabase when configured, built-in otherwise ===== */
function rowToType(r) {
  return {
    id: String(r.id),
    name: r.name,
    amount: Number(r.price),
    desc: r.description || "",
    colors: Array.isArray(r.colors) ? r.colors : [],
    sizes: Array.isArray(r.sizes) && r.sizes.length ? r.sizes : FALLBACK_SIZES,
    soldOut: !!r.sold_out
  };
}

async function loadProducts() {
  const configured = typeof SUPABASE_URL !== "undefined" && SUPABASE_URL &&
    typeof SUPABASE_ANON_KEY !== "undefined" && SUPABASE_ANON_KEY &&
    typeof supabase !== "undefined" && supabase.createClient;
  if (configured) {
    try {
      const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const res = await sb.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
      if (res.error) throw res.error;
      if (res.data && res.data.length) return res.data.map(rowToType);
      return [];
    } catch (e) {
      console.warn("Supabase load failed, using built-in products", e);
      return DEFAULT_TYPES;
    }
  }
  return DEFAULT_TYPES;
}

/* ===== cards ===== */
function buildCards() {
  grid.innerHTML = "";
  if (!TYPES.length) {
    grid.innerHTML = '<p class="empty">مفيش منتجات معروضة حاليًا. تابعنا قريب.</p>';
    return;
  }
  TYPES.forEach((t, ti) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card" + (t.soldOut ? " soldout" : "");
    card.dataset.type = ti;
    const cover = t.colors[0] ? t.colors[0].image : "";
    card.innerHTML =
      '<div class="c-img"><img src="' + cover + '" alt="' + t.name + '">' +
      (t.soldOut ? '<span class="soldout-badge">خلص</span>' : '') + '</div>' +
      '<div class="c-info"><h3>' + t.name + '</h3><p class="price">' + priceTxt(t) + ' <span class="ex">غير شامل الشحن</span></p>' +
      '<p class="count">' + colorCountTxt(t.colors.length) + '</p><span class="more">شوف التفاصيل والألوان</span></div>';
    card.addEventListener("click", () => openModal(ti, 0, card));
    grid.appendChild(card);
  });
}

/* ===== details modal ===== */
var select = function (i) {
  const t = TYPES[cur];
  selColor = i;
  const c = t.colors[i];
  mImg.src = c.image;
  mImg.alt = t.name + " - " + c.name;
  mColor.textContent = c.name;
  const msg = "عايز اطلب " + t.name + " (" + c.name + ")" + (selSize ? " مقاس " + selSize : "") + " بسعر " + priceTxt(t) + " (غير شامل الشحن)";
  mOrder.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  [...swBox.children].forEach((b, j) => {
    b.classList.toggle("active", j === i);
    b.setAttribute("aria-pressed", j === i);
  });
};

function openModal(ti, ci, card) {
  cur = ti; lastCard = card;
  const t = TYPES[ti];
  mName.textContent = t.name;
  mPrice.textContent = priceTxt(t);
  mDesc.textContent = t.desc;
  swBox.innerHTML = "";
  t.colors.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sw";
    b.style.background = c.swatch || "#eee";
    b.title = c.name;
    b.setAttribute("aria-label", c.name);
    b.addEventListener("click", () => select(i));
    swBox.appendChild(b);
  });
  selSize = null;
  szBox.innerHTML = "";
  t.sizes.forEach(z => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sz"; b.textContent = z;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      selSize = z; select(selColor);
      document.getElementById("m-size").textContent = z;
      document.getElementById("size-err").hidden = true;
      [...szBox.children].forEach(x => { x.classList.toggle("active", x === b); x.setAttribute("aria-pressed", x === b); });
    });
    szBox.appendChild(b);
  });
  document.getElementById("m-size").textContent = "اختار المقاس";
  document.getElementById("size-err").hidden = true;
  mSoldout.hidden = !t.soldOut;
  mAdd.hidden = !!t.soldOut;
  mOrder.hidden = !!t.soldOut;
  select(ci);
  modal.hidden = false;
  document.body.classList.add("lock");
  document.querySelector(".sheet").scrollTop = 0;
  document.getElementById("close").focus({ preventScroll: true });
}
function closeModal() {
  modal.hidden = true;
  document.body.classList.remove("lock");
  if (lastCard) lastCard.focus();
}
document.getElementById("close").addEventListener("click", closeModal);
document.getElementById("backdrop").addEventListener("click", closeModal);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

/* ===== cart ===== */
const DEPOSIT = 200;
const GOVS = ["القاهرة","الجيزة","الإسكندرية","القليوبية","الشرقية","الدقهلية","الغربية","المنوفية","البحيرة","كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء","جنوب سيناء","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح"];
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { cart = []; }

const $ = id => document.getElementById(id);
const cartEl = $("cart"), itemsEl = $("items"), cntEl = $("cart-count");
const stepCart = $("step-cart"), stepForm = $("step-form"), stepDone = $("step-done");
const findP = x => TYPES.find(t => t.id === x.p);
const findCi = (t, cn) => t.colors.findIndex(c => c.name === cn);
const validItem = x => { const t = findP(x); return t && !t.soldOut && findCi(t, x.cn) >= 0 && x.q > 0 && t.sizes.includes(x.s); };
const total = () => cart.reduce((a, x) => a + findP(x).amount * x.q, 0);
const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };

GOVS.forEach(g => { const o = document.createElement("option"); o.value = g; o.textContent = g; stepForm.gov.appendChild(o); });

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

function renderCart() {
  cart = cart.filter(validItem);
  const n = cart.reduce((a, x) => a + x.q, 0);
  cntEl.textContent = n;
  itemsEl.innerHTML = "";
  cart.forEach((x, idx) => {
    const t = findP(x), ci = findCi(t, x.cn), c = t.colors[ci];
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = '<img src="' + c.image + '" alt="">' +
      '<div><h4>' + t.name + '</h4><div class="sub2">اللون: ' + c.name + ' | المقاس: ' + x.s + '</div>' +
      '<div class="qty"><button type="button" data-a="minus" aria-label="أقل">-</button><b>' + x.q + '</b><button type="button" data-a="plus" aria-label="أكثر">+</button></div></div>' +
      '<div><div class="ip">' + fmt(t.amount * x.q) + '</div><button type="button" class="rm" data-a="rm">حذف</button></div>';
    li.addEventListener("click", e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (!a) return;
      if (a === "plus") x.q++;
      if (a === "minus") x.q = Math.max(1, x.q - 1);
      if (a === "rm") cart.splice(idx, 1);
      save(); renderCart();
    });
    itemsEl.appendChild(li);
  });
  const empty = cart.length === 0;
  $("cart-empty").hidden = !empty;
  $("totals").hidden = empty;
  $("cart-ship-note").hidden = empty;
  $("to-checkout").hidden = empty;
  const sub = total();
  $("t-sub").textContent = fmt(sub);
  $("t-rest").textContent = fmt(Math.max(0, sub - DEPOSIT));
  if (empty && !stepForm.hidden) showStep("cart");
  renderSummary();
}
function renderSummary() {
  const sub = total();
  $("summary").innerHTML = '<div><span>إجمالي المنتجات</span><b>' + fmt(sub) + '</b></div>' +
    '<div><span>ديبوزت يتحول الآن</span><b>' + fmt(DEPOSIT) + '</b></div>' +
    '<div><span>المتبقي</span><b>' + fmt(Math.max(0, sub - DEPOSIT)) + '</b></div>';
}
function showStep(s) {
  stepCart.hidden = s !== "cart";
  stepForm.hidden = s !== "form";
  stepDone.hidden = s !== "done";
  $("cart-title").textContent = s === "cart" ? "سلة الطلبات" : s === "form" ? "بيانات الشحن والدفع" : "إرسال الطلب";
  document.querySelector(".cart-sheet").scrollTop = 0;
}
function openCart() {
  if (!modal.hidden) { modal.hidden = true; }
  renderCart(); showStep("cart");
  cartEl.hidden = false; document.body.classList.add("lock");
  $("cart-close").focus({ preventScroll: true });
}
function closeCart() { cartEl.hidden = true; document.body.classList.remove("lock"); }

mAdd.addEventListener("click", () => {
  const t = TYPES[cur];
  if (t.soldOut) return;
  if (!selSize) { document.getElementById("size-err").hidden = false; szBox.scrollIntoView({ block: "center" }); return; }
  const cn = t.colors[selColor].name;
  const f = cart.find(x => x.p === t.id && x.cn === cn && x.s === selSize);
  if (f) f.q++; else cart.push({ p: t.id, cn: cn, s: selSize, q: 1 });
  save(); renderCart();
  closeModal();
  cntEl.classList.remove("bump"); void cntEl.offsetWidth; cntEl.classList.add("bump");
  toast("تمت الإضافة للسلة");
});
$("cart-open").addEventListener("click", openCart);
$("cart-close").addEventListener("click", closeCart);
$("cart-backdrop").addEventListener("click", closeCart);
$("keep-shopping").addEventListener("click", () => { closeCart(); document.getElementById("products").scrollIntoView(); });
$("to-checkout").addEventListener("click", () => showStep("form"));
$("back-cart").addEventListener("click", () => showStep("cart"));
document.addEventListener("keydown", e => { if (e.key === "Escape" && !cartEl.hidden) closeCart(); });
$("copy").addEventListener("click", () => {
  const n = $("wallet").textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(n).then(() => toast("تم نسخ الرقم"), () => toast(n));
  else toast(n);
});

const AR = "٠١٢٣٤٥٦٧٨٩";
const digits = v => v.replace(/[٠-٩]/g, d => AR.indexOf(d)).replace(/[\s-]/g, "");
const okPhone = v => /^(01\d{9}|\+?201\d{9})$/.test(v);

function orderTextLines(d) {
  const sub = total();
  const lines = ["طلب جديد من موقع Kotton", ""];
  cart.forEach((x, i) => {
    const t = findP(x);
    lines.push((i + 1) + "- " + t.name + " | اللون: " + x.cn + " | المقاس: " + x.s + " | الكمية: " + x.q + " | " + fmt(t.amount * x.q));
  });
  lines.push("", "إجمالي المنتجات: " + fmt(sub), "(الأسعار غير شاملة مصاريف الشحن)", "الديبوزت (200 جنيه تتخصم من السعر): " + fmt(DEPOSIT), "المتبقي: " + fmt(Math.max(0, sub - DEPOSIT)), "",
    "الاسم: " + d.name, "الهاتف: " + d.phone);
  if (d.phone2) lines.push("هاتف إضافي: " + d.phone2);
  lines.push("المحافظة: " + d.gov, "المركز: " + d.markaz, "العنوان: " + d.address, "", "هبعت سكرين تحويل الديبوزت في المحادثة دي.");
  return lines;
}

stepForm.addEventListener("submit", async e => {
  e.preventDefault();
  const f = stepForm;
  const name = f.elements.name.value.trim().replace(/\s+/g, " ");
  const phone = digits(f.phone.value), phone2 = digits(f.phone2.value);
  const gov = f.gov.value, markaz = f.markaz.value.trim(), address = f.address.value.trim();
  [...f.elements].forEach(x => x.classList && x.classList.remove("bad"));
  let msg = "", bad = null;
  if (name.split(" ").length < 3) { msg = "اكتب الاسم ثلاثي"; bad = f.elements.name; }
  else if (!okPhone(phone)) { msg = "اكتب رقم هاتف صحيح (11 رقم يبدأ بـ 01)"; bad = f.phone; }
  else if (phone2 && !okPhone(phone2)) { msg = "الرقم الإضافي غير صحيح"; bad = f.phone2; }
  else if (!gov) { msg = "اختار المحافظة"; bad = f.gov; }
  else if (!markaz) { msg = "اكتب المركز أو المنطقة"; bad = f.markaz; }
  else if (address.length < 8) { msg = "اكتب العنوان بالتفصيل"; bad = f.address; }
  else if (!cart.length) { msg = "السلة فاضية"; }
  $("err").textContent = msg;
  if (msg) {
    if (bad) { bad.classList.add("bad"); bad.focus(); }
    return;
  }

  const d = { name, phone, phone2, gov, markaz, address };
  const waUrl = "https://wa.me/" + WA + "?text=" + encodeURIComponent(orderTextLines(d).join("\n"));
  lastOrder = { waUrl };
  window.lastWaUrl = waUrl;
  showStep("done");
  window.open(waUrl, "_blank", "noopener");
});

$("done-wa").addEventListener("click", () => { if (lastOrder) window.open(lastOrder.waUrl, "_blank", "noopener"); });
$("done-new").addEventListener("click", () => {
  cart = []; save(); renderCart(); showStep("cart");
  stepForm.reset();
});

/* ===== start ===== */
(async function start() {
  const loading = document.getElementById("grid-loading");
  TYPES = await loadProducts();
  if (loading) loading.remove();
  buildCards();
  renderCart();
})();
