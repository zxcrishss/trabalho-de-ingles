/** Site de Ivan Eiji Kaminagakura: troca de idioma, menu, FAQ, formulário e animações.
 *  O HTML já nasce em português; depende de config.js e translations.js (carregados antes). */

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let lang = "pt";

/** Busca a tradução; cai para português e, por fim, para a própria chave. */
const t = (key) => TR[lang][key] ?? TR.pt[key] ?? key;

// ---------------------------------------------------------------------------
// Idioma
// ---------------------------------------------------------------------------
/** Troca o idioma sem recarregar a página (a posição de rolagem não muda). */
function applyLanguage(next) {
  lang = TR[next] ? next : "pt";
  document.documentElement.lang = lang === "en" ? "en" : "pt-BR";

  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); }); // só textos do nosso dicionário
  $$("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":");
      el.setAttribute(attr, t(key));
    });
  });

  document.title = t("meta.title");
  $("meta[name=description]")?.setAttribute("content", t("meta.desc"));
  $$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

  try { localStorage.setItem("lang", lang); } catch { /* armazenamento indisponível */ }
}

function initLanguage() {
  $$("[data-lang]").forEach((b) => b.addEventListener("click", () => applyLanguage(b.dataset.lang)));
  try {
    const saved = localStorage.getItem("lang");
    if (saved && saved !== "pt") applyLanguage(saved);
  } catch { /* usa o padrão */ }
}

// ---------------------------------------------------------------------------
// Menu mobile
// ---------------------------------------------------------------------------
function initMenu() {
  const burger = $(".burger");
  const menu = $("#menu");
  if (!burger || !menu) return;

  const close = () => {
    menu.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  };

  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    menu.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// ---------------------------------------------------------------------------
// FAQ (acordeão)
// ---------------------------------------------------------------------------
function initAccordions() {
  $$(".accordion button").forEach((button) => {
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      document.getElementById(button.getAttribute("aria-controls")).hidden = open;
    });
  });
}

// ---------------------------------------------------------------------------
// Formulário de agendamento (envia para o Gmail pelo FormSubmit)
// ---------------------------------------------------------------------------
/** Endereço de envio do FormSubmit. Depois de ativar, dá para trocar o e-mail pelo código aleatório que o serviço fornece. */
const FORM_ENDPOINT = "https://formsubmit.co/ajax/ivan.psinodiadia@gmail.com";

/** Validação local. Retorna { campo: código }. */
function validateForm(fields) {
  const errors = {};
  const digits = fields.telefone.value.replace(/\D/g, "");

  if (fields.nome.value.trim().length < 2) errors.nome = "name";
  if (digits.length < 10 || digits.length > 13) errors.telefone = "phone";
  if (fields.email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email.value)) errors.email = "email";
  if (!fields.periodo.value) errors.periodo = "period";
  if (!fields.privacidade.checked) errors.privacidade = "privacy";
  return errors;
}

function initForm(form) {
  const status = $("[data-status]", form);

  /** Define o texto por chave; guardar a chave permite retraduzir ao trocar de idioma. */
  const setText = (el, key) => { el.dataset.i18n = key; el.textContent = t(key); };

  const clearMessages = () => {
    $$("[data-error-for]", form).forEach((p) => { delete p.dataset.i18n; p.textContent = ""; });
    $$("[aria-invalid]", form).forEach((i) => i.removeAttribute("aria-invalid"));
    delete status.dataset.i18n;
    status.textContent = "";
    status.className = "status";
  };

  const showErrors = (errors) => {
    Object.entries(errors).forEach(([field, code]) => {
      setText($(`[data-error-for="${field}"]`, form), `e.${code}`);
      form.elements[field]?.setAttribute("aria-invalid", "true");
    });
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const errors = validateForm(form.elements);
    if (Object.keys(errors).length) {
      showErrors(errors);
      $("[aria-invalid]", form)?.focus();
      return;
    }

    const v = Object.fromEntries(new FormData(form));
    if (v.website) return; // campo escondido: só robôs preenchem

    const button = $("button[type=submit]", form);
    button.disabled = true;

    const periods = { manha: "Manhã", tarde: "Tarde", noite: "Noite", flexivel: "Flexível" };
    const dados = {
      Nome: v.nome,
      Telefone: v.telefone,
      Período: periods[v.periodo],
      Mensagem: v.mensagem || "-",
      _subject: "Nova solicitação de agendamento",
      _template: "table",
      _captcha: "false",
    };
    if (v.email) dados.email = v.email; // o FormSubmit usa esse campo como "responder para"

    let code = "server", ok = false;
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(dados),
      });
      const resposta = await res.json();
      if (res.ok && String(resposta.success) === "true") { code = "ok"; ok = true; }
    } catch {
      code = "network";
    }

    button.disabled = false;
    setText(status, `s.${code}`);
    status.classList.add(ok ? "ok" : "bad");
    if (ok) form.reset();
  });
}

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------
const year = $("#year");
if (year) year.textContent = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Movimento: anima ao entrar na tela e guia a respiração
// ---------------------------------------------------------------------------
function startOrb(orb) {
  const text = $("#orb-text", orb);
  const set = (key) => { text.dataset.i18n = key; text.textContent = t(key); };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { set("breathe.calm"); return; }
  let inhale = true;
  set("breathe.in");
  setInterval(() => { inhale = !inhale; set(inhale ? "breathe.in" : "breathe.out"); }, 4000); // metade do ciclo de 8s do CSS
}

function initMotion() {
  const show = (el) => { el.classList.add("in"); if (el.classList.contains("orb")) startOrb(el); };
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) { items.forEach(show); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
  }), { threshold: 0.35 });
  items.forEach((el) => io.observe(el));
}

initMenu();
initAccordions();
initMotion();
const agendarForm = $("#form-agendar");
if (agendarForm) initForm(agendarForm);
initLanguage();

// Canais de contato a partir do CONFIG
(function () {
  const urls = { whatsapp: CONFIG.whatsapp && `https://wa.me/${CONFIG.whatsapp}`, instagram: CONFIG.instagram, linkedin: CONFIG.linkedin, email: CONFIG.email && `mailto:${CONFIG.email}` };
  const names = { whatsapp: "WhatsApp", instagram: "Instagram", linkedin: "LinkedIn", email: "E-mail" };
  const items = Object.entries(urls).filter(([, u]) => u).map(([k, u]) =>
    `<li><a href="${u}" ${k === "email" ? "" : 'target="_blank" rel="noopener"'} data-i18n-attr="aria-label:aria.${k}">${names[k]}</a></li>`).join("");
  $$("ul.social").forEach((ul) => { ul.innerHTML = items; });
  if (CONFIG.whatsapp) document.body.insertAdjacentHTML("beforeend", `<a class="wa-float" href="${urls.whatsapp}" target="_blank" rel="noopener" data-i18n="wa.float">Conversar no WhatsApp</a>`);
})();