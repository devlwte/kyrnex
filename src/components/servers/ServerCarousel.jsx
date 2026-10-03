import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ServerCard } from "./ServerCard";
import { useTranslation } from "../../context/I18nContext";

export function ServerCarousel({
  servers,
  selectedServerId,
  onSelectServer,
  onStartServer,
  onStopServer,
  onRestartServer,
  onDeleteServer,
}) {
  const { t } = useTranslation();
  const scrollRef = useRef(null);

  // Convert vertical mouse wheel into horizontal scroll
  const handleWheel = (e) => {
    if (scrollRef.current) {
      if (e.deltaY !== 0) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  if (!servers || servers.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center border border-dashed dark:border-kyrn-border border-slate-300 rounded-xl dark:bg-kyrn-card/50 bg-white/60 dark:text-slate-400 text-slate-500 text-xs px-4 text-center">
        {t("servers.noServersCarousel", "No hay servidores configurados. Haz clic en '+ Nuevo servidor' para agregar uno.")}
      </div>
    );
  }

  return (
    <div className="relative group w-full max-w-full min-w-0">
      {/* Scroll Navigation Arrows */}
      <button
        onClick={scrollLeft}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full dark:bg-slate-900/90 bg-white dark:border-slate-700 border-slate-200 dark:text-slate-300 text-slate-700 hover:dark:text-white hover:text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        title={t("servers.scrollLeft", "Desplazar a la izquierda")}
      >
        <ChevronLeft size={16} />
      </button>

      <button
        onClick={scrollRight}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full dark:bg-slate-900/90 bg-white dark:border-slate-700 border-slate-200 dark:text-slate-300 text-slate-700 hover:dark:text-white hover:text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        title={t("servers.scrollRight", "Desplazar a la derecha")}
      >
        <ChevronRight size={16} />
      </button>

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 px-1 horizontal-scroll scroll-smooth w-full max-w-full"
      >
        {servers.map((server) => (
          <ServerCard
            key={server.id}
            server={server}
            isSelected={server.id === selectedServerId}
            onSelect={() => onSelectServer(server.id)}
            onStart={onStartServer}
            onStop={onStopServer}
            onRestart={onRestartServer}
            onDelete={onDeleteServer}
          />
        ))}
      </div>
    </div>
  );
}

export default ServerCarousel;
