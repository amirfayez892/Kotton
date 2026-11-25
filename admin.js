const $ = id => document.getElementById(id);
const views = { setup: $("setup-warning"), login: $("login-view"), panel: $("panel-view"), editor: $("editor-view") };
const ALL_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const BUCKET = "product-images";

let sb = null;
let products = [];
let editing = null;   // product being edited (or new)
let editColors = [];  // colors of the product being edited: {name, swatch, image, _file}

function show(v) {
  views.setup.hidden = v !== "setup";
  views.login.hidden = v !== "login";
  views.panel.hidden = v !== "panel";
  views.editor.hidden = v !== "editor";
  $("logout").hidden = !(v === "panel" || v === "editor");
  window.scrollTo(0, 0);
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ===== boot ===== */
(function boot() {
  const ok = typeof SUPABASE_URL !== "undefined" && SUPABASE_URL &&
    typeof SUPABASE_ANON_KEY !== "undefined" && SUPABASE_ANON_KEY &&
    typeof supabase !== "undefined" && supabase.createClient;
  if (!ok) { show("setup"); return; }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  sb.auth.getSession().then(r => { show(r.data && r.data.session ? "panel" : "login"); if (r.data && r.data.session) loadProducts(); });
  sb.auth.onAuthStateChange((ev, session) => {
    if (session) { show("panel"); loadProducts(); }
    else show("login");
  });
})();

/* ===== login ===== */
$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  $("login-err").textContent = "";
  $("login-btn").disabled = true;
  $("login-btn").textContent = "لحظة...";
  try {
    const r = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    if (r.error) $("login-err").textContent = "الإيميل أو الباسورد غلط. جرب تاني.";
  } catch (err) {
    $("login-err").textContent = "في مشكلة اتصال. اتأكد من النت ومن config.js.";
  }
  $("login-btn").disabled = false;
  $("login-btn").textContent = "دخول";
});
$("logout").addEventListener("click", () => sb.auth.signOut());

/* ===== product list ===== */
async function loadProducts() {
  $("panel-err").textContent = "";
  const r = await sb.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (r.error) {
    $("panel-err").textContent = "مش قادر أقرا المنتجات. اتأكد إنك شغلت ملف setup.sql في Supabase (خطوة 3 في دليل التشغيل).";
    return;
  }
  products = r.data || [];
  renderList();
}
$("refresh").addEventListener("click", loadProducts);

function renderList() {
  const box = $("plist");
  box.innerHTML = "";
  if (!products.length) {
    box.innerHTML = '<p class="empty">مفيش منتجات. دوس "+ منتج جديد" عشان تضيف أول منتج.</p>';
    return;
  }
  products.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "prow";
    const img = p.colors && p.colors[0] && p.colors[0].image ? p.colors[0].image : "";
    row.innerHTML =
      '<img src="' + img + '" alt="">' +
      '<div><h4>' + p.name + (p.sold_out ? ' <span class="p-badge">خلص</span>' : '') + '</h4>' +
      '<div class="pmeta">' + p.price + ' جنيه | ' + (p.colors ? p.colors.length : 0) + ' لون | المقاسات: ' + (p.sizes || []).join(" ") + '</div></div>' +
      '<div class="pbtns">' +
      '<button type="button" class="pbtn" data-a="edit">تعديل</button>' +
      (p.sold_out
        ? '<button type="button" class="pbtn ok" data-a="avail">رجّعه متاح</button>'
        : '<button type="button" class="pbtn warn" data-a="soldout">علّمه خلص</button>') +
      '<button type="button" class="pbtn" data-a="up" ' + (i === 0 ? "disabled" : "") + '>↑</button>' +
      '<button type="button" class="pbtn" data-a="down" ' + (i === products.length - 1 ? "disabled" : "") + '>↓</button>' +
      '<button type="button" class="pbtn danger" data-a="del">حذف</button>' +
      '</div>';
    row.addEventListener("click", async e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (!a) return;
      if (a === "edit") openEditor(p);
      if (a === "soldout") updateRow(p.id, { sold_out: true }, "اتعلم خلص");
      if (a === "avail") updateRow(p.id, { sold_out: false }, "رجع متاح");
      if (a === "del") {
        if (confirm('متأكد إنك عايز تحذف "' + p.name + '"؟ مش هتقدر ترجعه.')) {
          const r = await sb.from("products").delete().eq("id", p.id);
          if (r.error) $("panel-err").textContent = "الحذف مكملش: " + r.error.message;
          else { toast("اتحذف"); loadProducts(); }
        }
      }
      if (a === "up" || a === "down") {
        const j = a === "up" ? i - 1 : i + 1;
        const other = products[j];
        const so1 = p.sort_order ?? i, so2 = other.sort_order ?? j;
        await sb.from("products").update({ sort_order: so2 }).eq("id", p.id);
        await sb.from("products").update({ sort_order: so1 }).eq("id", other.id);
        loadProducts();
      }
    });
    box.appendChild(row);
  });
}

async function updateRow(id, patch, okMsg) {
  const r = await sb.from("products").update(patch).eq("id", id);
  if (r.error) $("panel-err").textContent = "التعديل مكملش: " + r.error.message;
  else { toast(okMsg); loadProducts(); }
}

/* ===== editor ===== */
$("add-product").addEventListener("click", () => openEditor(null));
$("cancel-edit").addEventListener("click", () => { show("panel"); });

function openEditor(p) {
  editing = p ? JSON.parse(JSON.stringify(p)) : {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    name: "", price: "", description: "",
    sizes: ["S", "M", "L", "XL"], colors: [], sold_out: false,
    sort_order: products.length ? Math.max(...products.map(x => x.sort_order || 0)) + 1 : 1
  };
  editColors = (editing.colors || []).map(c => ({ name: c.name || "", swatch: c.swatch || "", image: c.image || "", _file: null }));
  $("editor-title").textContent = p ? "تعديل: " + p.name : "منتج جديد";
  const f = $("editor-form");
  f.pname.value = editing.name || "";
  f.pprice.value = editing.price || "";
  f.psort.value = editing.sort_order ?? "";
  f.pdesc.value = editing.description || "";
  f.psoldout.checked = !!editing.sold_out;
  renderSizeChecks(editing.sizes || []);
  renderColorRows();
  $("editor-err").textContent = "";
  show("editor");
}

function renderSizeChecks(selected) {
  const box = $("sizechecks");
  box.innerHTML = "";
  ALL_SIZES.forEach(z => {
    const l = document.createElement("label");
    l.innerHTML = '<input type="checkbox" value="' + z + '"' + (selected.includes(z) ? " checked" : "") + "> " + z;
    box.appendChild(l);
  });
}

function renderColorRows() {
  const box = $("colors");
  box.innerHTML = "";
  editColors.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "c-row";
    row.innerHTML =
      '<input type="text" class="c-name" placeholder="اسم اللون (مثال: أسود)" value="' + (c.name || "").replace(/"/g, "&quot;") + '">' +
      '<div class="c-imgcell">' +
      '<input type="color" class="c-pick" value="' + (/^#[0-9a-fA-F]{6}$/.test(c.swatch || "") ? c.swatch : "#cccccc") + '" title="اختار درجة اللون">' +
      '<input type="text" class="c-swatch" dir="ltr" placeholder="#1b2631" value="' + (c.swatch || "").replace(/"/g, "&quot;") + '">' +
      '</div>' +
      '<div class="c-imgcell">' +
      (c.image ? '<img class="c-preview" src="' + c.image + '" alt="">' : '<span class="c-preview"></span>') +
      '<label class="c-file-btn">' + (c.image ? "تغيير الصورة" : "اختار صورة") + '<input type="file" accept="image/*" hidden></label>' +
      '<button type="button" class="c-del" title="حذف اللون">&times;</button>' +
      '</div>';
    const nameIn = row.querySelector(".c-name");
    const swIn = row.querySelector(".c-swatch");
    const pick = row.querySelector(".c-pick");
    const file = row.querySelector('input[type=file]');
    nameIn.addEventListener("input", () => c.name = nameIn.value);
    swIn.addEventListener("input", () => c.swatch = swIn.value.trim());
    pick.addEventListener("input", () => { c.swatch = pick.value; swIn.value = pick.value; });
    file.addEventListener("change", () => {
      if (file.files && file.files[0]) {
        c._file = file.files[0];
        const pv = row.querySelector(".c-preview");
        pv.src = URL.createObjectURL(file.files[0]);
        pv.outerHTML = pv.outerHTML.replace("span", "img");
        row.querySelector(".c-preview").src = URL.createObjectURL(file.files[0]);
      }
    });
    row.querySelector(".c-del").addEventListener("click", () => { editColors.splice(i, 1); renderColorRows(); });
    box.appendChild(row);
  });
}
$("add-color").addEventListener("click", () => { editColors.push({ name: "", swatch: "", image: "", _file: null }); renderColorRows(); });

async function uploadImage(productId, file, idx) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = productId + "/" + Date.now() + "-" + idx + "." + ext;
  const up = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (up.error) throw up.error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

$("editor-form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  const err = $("editor-err");
  err.textContent = "";
  const name = f.pname.value.trim();
  const price = Number(f.pprice.value);
  const sizes = [...$("sizechecks").querySelectorAll("input:checked")].map(x => x.value);
  if (!name) { err.textContent = "اكتب اسم المنتج"; return; }
  if (!price || price <= 0) { err.textContent = "اكتب سعر صحيح"; return; }
  if (!sizes.length) { err.textContent = "اختار مقاس واحد على الأقل"; return; }
  if (!editColors.length) { err.textContent = "ضيف لون واحد على الأقل بصورته"; return; }
  for (let i = 0; i < editColors.length; i++) {
    const c = editColors[i];
    if (!c.name.trim()) { err.textContent = "في لون من غير اسم (لون رقم " + (i + 1) + ")"; return; }
    if (!c.image && !c._file) { err.textContent = 'اللون "' + c.name + '" محتاج صورة'; return; }
  }

  const btn = $("save-btn");
  btn.disabled = true; btn.textContent = "بيحفظ..."; views.editor.classList.add("saving");
  try {
    for (let i = 0; i < editColors.length; i++) {
      const c = editColors[i];
      if (c._file) c.image = await uploadImage(editing.id, c._file, i);
    }
    const row = {
      id: editing.id,
      name: name,
      description: f.pdesc.value.trim(),
      price: price,
      sizes: sizes,
      colors: editColors.map(c => ({ name: c.name.trim(), swatch: (c.swatch || "").trim(), image: c.image })),
      sold_out: f.psoldout.checked,
      sort_order: f.psort.value === "" ? (editing.sort_order ?? 0) : Number(f.psort.value)
    };
    const r = await sb.from("products").upsert(row);
    if (r.error) throw r.error;
    toast("اتحفظ");
    show("panel");
    loadProducts();
  } catch (ex) {
    err.textContent = "الحفظ مكملش: " + (ex.message || ex) + " — لو المشكلة في الصلاحيات، راجع إن setup.sql اشتغل صح.";
  }
  btn.disabled = false; btn.textContent = "حفظ المنتج"; views.editor.classList.remove("saving");
});
