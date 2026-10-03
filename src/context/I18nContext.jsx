import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import appConfig from "../config/app.config.json";
import esLocale from "../locales/es.json";
import enLocale from "../locales/en.json";
import defaultIconPng from "../../assets/icon.png";
import defaultIconSvg from "../../assets/icon.svg";

// Map of available locales
const LOCALES = {
  es: esLocale,
  en: enLocale,
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem("kyrnex_language");
      if (saved && LOCALES[saved]) {
        return saved;
      }
    } catch {}
    return appConfig.defaultSettings?.defaultLanguage || "es";
  });

  const setLanguage = useCallback((langCode) => {
    if (LOCALES[langCode]) {
      setLanguageState(langCode);
      try {
        localStorage.setItem("kyrnex_language", langCode);
        document.documentElement.lang = langCode;
      } catch (err) {
        console.warn("Could not save language to localStorage:", err);
      }
    } else {
      console.warn(`Locale "${langCode}" not found.`);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  /**
   * Translate a key using dot notation, e.g. t("nav.servers")
   * If not found in current language, falls back to default language, then fallback string or key itself.
   */
  const t = useCallback(
    (keyPath, fallback = "") => {
      if (!keyPath || typeof keyPath !== "string") return fallback;

      const keys = keyPath.split(".");
      
      // 1. Try current language
      let value = LOCALES[language];
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }

      if (typeof value === "string") return value;

      // 2. Fallback to default language (es) if different
      if (language !== "es") {
        let fallbackValue = LOCALES.es;
        for (const k of keys) {
          if (fallbackValue && typeof fallbackValue === "object" && k in fallbackValue) {
            fallbackValue = fallbackValue[k];
          } else {
            fallbackValue = undefined;
            break;
          }
        }
        if (typeof fallbackValue === "string") return fallbackValue;
      }

      // 3. Fallback to provided fallback or keyPath
      return fallback || keyPath;
    },
    [language]
  );

  const contextValue = useMemo(() => {
    const rawIcon = appConfig.branding?.iconPng;
    // Resolve relative path if needed, or fallback to bundled asset
    const resolvedIcon = rawIcon
      ? (rawIcon.startsWith("/") ? "." + rawIcon : rawIcon)
      : defaultIconPng;

    return {
      t,
      language,
      setLanguage,
      changeLanguage: setLanguage,
      supportedLanguages: appConfig.supportedLanguages || [],
      appConfig: {
        ...appConfig,
        branding: {
          ...appConfig.branding,
          iconPng: resolvedIcon,
          defaultIconPng,
          defaultIconSvg,
        },
      },
      defaultIconPng,
      defaultIconSvg,
    };
  }, [t, language, setLanguage]);

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

export default I18nContext;
