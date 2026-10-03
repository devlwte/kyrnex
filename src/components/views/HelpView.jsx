import React, { useState } from "react";
import {
  HelpCircle,
  FolderTree,
  Zap,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  FileCode,
  Sliders,
  Check,
  Copy,
} from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export function HelpView() {
  const { t } = useTranslation();
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [copiedSnippet, setCopiedSnippet] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = [
    {
      id: "q1",
      category: "folders",
      q: t("help.faqs.q1", "Tengo mi página en la raíz (sin carpeta 'public'). ¿Cómo la configuro?"),
      a: t("help.faqs.a1", "Si tus archivos (index.html, styles.css, app.js, catalog/) están ubicados directamente en la raíz de tu proyecto sin ninguna subcarpeta llamada 'public', debes dejar el campo 'Carpeta pública' completamente VACÍO al crear o editar el servidor. Kyrnex detectará automáticamente que los archivos estáticos residen en la raíz del proyecto y los servirá sin error 404."),
      highlight: true,
    },
    {
      id: "q2",
      category: "folders",
      q: t("help.faqs.q2", "¿Qué diferencia hay entre 'Carpeta raíz' y 'Carpeta pública'?"),
      a: t("help.faqs.a2", "La 'Carpeta raíz' es la carpeta principal donde reside tu repositorio o proyecto. La 'Carpeta pública' es una subcarpeta dentro de la raíz (típico en frameworks como Next.js, Vite o Express MVC) donde se guardan archivos estáticos públicos. Si tu proyecto es plano y tiene el index.html en la misma raíz, la carpeta pública debe quedar en blanco."),
    },
    {
      id: "q3",
      category: "ports",
      q: t("help.faqs.q3", "¿Qué ocurre si el puerto configurado (ej. 3000 o 3050) ya está ocupado?"),
      a: t("help.faqs.a3", "Kyrnex cuenta con detección inteligente de puertos (Auto-Fallback). Si otra aplicación o servidor de tu sistema ya está utilizando el puerto solicitado, Kyrnex no fallará: buscará automáticamente el siguiente puerto libre consecutivo (ej. 3051, 3052) y actualizará la URL en la interfaz en tiempo real."),
    },
    {
      id: "q4",
      category: "preview",
      q: t("help.faqs.q4", "¿Cómo funciona la vista previa en vivo y el botón de recarga (↻)?"),
      a: t("help.faqs.a4", "Kyrnex no necesita navegadores externos pesados ni Puppeteer. Utiliza la tecnología nativa de renderizado offscreen de Electron para tomar una captura fotográfica de tu aplicación web y guardarla en caché de disco. Al hacer clic en ↻, se captura de nuevo la pantalla en caliente."),
    },
    {
      id: "q5",
      category: "notifications",
      q: t("help.faqs.q5", "¿Por qué no vuelven a aparecer los anuncios o avisos que ya leí o eliminé?"),
      a: t("help.faqs.a5", "Kyrnex implementa deduplicación local persistente mediante IDs únicos. Cuando marcas una notificación como leída o la eliminas de la lista, su identificador se guarda en la memoria local. En futuras sincronizaciones con el feed remoto de GitHub, Kyrnex ignorará esos avisos para no molestarte con contenido repetido. Puedes reiniciar este historial desde la pestaña Configuración si deseas probar."),
    },
    {
      id: "q6",
      category: "troubleshooting",
      q: t("help.faqs.q6", "Mi servidor está en verde (activo) pero veo una página con 'Kyrnex Local Runtime'"),
      a: t("help.faqs.a6", "Esa es la pantalla de cortesía que Kyrnex muestra cuando el servidor está funcionando pero no encuentra tu archivo 'index.html'. Revisa que el campo 'Archivo principal' coincida con el nombre exacto de tu archivo (ej. index.html o app.js) y que 'Carpeta pública' esté vacía si el archivo está en la raíz."),
    },
    {
      id: "q7",
      category: "troubleshooting",
      q: t("help.faqs.q7", "Modifiqué un archivo HTML o CSS. ¿Debo reiniciar el servidor?"),
      a: t("help.faqs.a7", "Para cambios en archivos estáticos (HTML, CSS, JS del navegador), no es necesario reiniciar el servidor; solo refresca tu navegador o pulsa ↻ en la vista previa. Si modificaste un router de backend Node.js (routes.mjs o app.js), pulsa el botón de reinicio en el carrusel para aplicar cambios en caliente."),
    },
  ];

  const categories = [
    { id: "all", label: t("help.categories.all", "Todas las preguntas") },
    { id: "folders", label: t("help.categories.folders", "Carpetas y Estructura") },
    { id: "ports", label: t("help.categories.ports", "Puertos y Red") },
    { id: "preview", label: t("help.categories.preview", "Vistas Previas") },
    { id: "notifications", label: t("help.categories.notifications", "Notificaciones") },
    { id: "troubleshooting", label: t("help.categories.troubleshooting", "Solución de Problemas") },
  ];

  const filteredFaqs = faqs.filter((item) => {
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      searchFilter === "" ||
      item.q.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.a.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-6 sm:space-y-8 select-none min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30">
              <HelpCircle size={18} />
            </div>
            <h3 className="text-xl font-bold dark:text-white text-slate-900">
              {t("help.title", "Centro de Ayuda y Guía de Uso")}
            </h3>
          </div>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">
            {t("help.subtitle", "Documentación, preguntas frecuentes y consejos para aprovechar Kyrnex")}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("help.searchPlaceholder", "Buscar en preguntas frecuentes...")}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-kyrn-blue"
          />
        </div>
      </div>

      {/* Quick Tips Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-blue-500">
            <FolderTree size={16} />
            <h4 className="text-xs font-bold dark:text-white text-slate-900">
              {t("help.tip1Title", "Desarrollo sin subcarpetas (Raíz limpia)")}
            </h4>
          </div>
          <p className="text-[11px] dark:text-slate-400 text-slate-600 leading-relaxed">
            {t("help.tip1Desc", "Si tu proyecto tiene el archivo index.html directamente en la raíz, deja 'Carpeta pública' en blanco. Kyrnex se encarga de servir tus recursos sin complicaciones.")}
          </p>
        </div>

        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500">
            <Zap size={16} />
            <h4 className="text-xs font-bold dark:text-white text-slate-900">
              {t("help.tip2Title", "Soporte Multi-Servidor Simultáneo")}
            </h4>
          </div>
          <p className="text-[11px] dark:text-slate-400 text-slate-600 leading-relaxed">
            {t("help.tip2Desc", "Puedes ejecutar tantos servidores como desees al mismo tiempo (ej. uno en 3000, otro en 3050 y otro en 8080) sin interferencia entre ellos.")}
          </p>
        </div>

        <div className="dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-purple-500">
            <ShieldCheck size={16} />
            <h4 className="text-xs font-bold dark:text-white text-slate-900">
              {t("help.tip3Title", "Capturas de Pantalla en Tiempo Real")}
            </h4>
          </div>
          <p className="text-[11px] dark:text-slate-400 text-slate-600 leading-relaxed">
            {t("help.tip3Desc", "Haz clic en el botón ↻ de la vista previa para actualizar la portada visual con los últimos cambios visuales de tu web.")}
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto horizontal-scroll pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? "bg-kyrn-blue text-white shadow-glow"
                : "dark:bg-kyrn-card bg-white dark:text-slate-400 text-slate-600 border dark:border-kyrn-border border-slate-200 hover:dark:text-white hover:text-slate-900"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQs Accordion */}
      <div className="space-y-3">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div
                key={faq.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  faq.highlight
                    ? "dark:bg-[#131d2e] bg-blue-50/50 border-blue-500/50 shadow-sm"
                    : "dark:bg-kyrn-card bg-white dark:border-kyrn-border border-slate-200 shadow-sm"
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold dark:text-white text-slate-900">
                    {faq.q}
                  </span>
                  <div className="p-1 rounded-full dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500 flex-shrink-0">
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs dark:text-slate-300 text-slate-700 leading-relaxed border-t dark:border-kyrn-border/50 border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center dark:text-slate-500 text-slate-400 text-xs">
            {t("help.noFaqFound", "No se encontraron preguntas que coincidan con la búsqueda.")}
          </div>
        )}
      </div>

      {/* Snippet Examples */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">
          {t("help.snippetsTitle", "Estructuras de Proyectos Compatibles")}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flat structure */}
          <div className="dark:bg-[#070b12] bg-slate-900 rounded-xl p-4 border dark:border-kyrn-border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-blue-400 font-bold">
                {t("help.snippetFlat", "Proyecto Plano / Estático Simple")}
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    `mi-sitio-web/\n├── index.html\n├── styles.css\n├── app.js\n└── assets/`,
                    "flat"
                  )
                }
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSnippet === "flat" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSnippet === "flat" ? t("help.copied", "Copiado") : t("help.copySnippet", "Copiar")}</span>
              </button>
            </div>
            <pre className="text-[11px] text-slate-400">
{`mi-sitio-web/
├── index.html       <- Archivo principal
├── styles.css
├── app.js
└── assets/`}
            </pre>
            <p className="text-[10px] text-slate-500 font-sans">
              Configuración recomendada: <strong className="text-slate-300">Carpeta pública = "" (Vacío)</strong>
            </p>
          </div>

          {/* MVC structure */}
          <div className="dark:bg-[#070b12] bg-slate-900 rounded-xl p-4 border dark:border-kyrn-border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-emerald-400 font-bold">
                {t("help.snippetMVC", "Proyecto MVC / Estructurado")}
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    `mi-app-express/\n├── server.js\n├── public/\n│   ├── css/\n│   └── js/\n└── views/\n    └── index.ejs`,
                    "mvc"
                  )
                }
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSnippet === "mvc" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSnippet === "mvc" ? t("help.copied", "Copiado") : t("help.copySnippet", "Copiar")}</span>
              </button>
            </div>
            <pre className="text-[11px] text-slate-400">
{`mi-app-express/
├── server.js        <- Archivo principal
├── public/          <- Carpeta pública
│   ├── css/
│   └── js/
└── views/           <- Carpeta vistas (EJS)
    └── index.ejs`}
            </pre>
            <p className="text-[10px] text-slate-500 font-sans">
              Configuración: <strong className="text-slate-300">Carpeta pública = "public", Vistas = "views"</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpView;
