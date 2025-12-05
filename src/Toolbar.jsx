import {Maximize} from "lucide-react";

export function Toolbar({isFullscreen, onToggleFullscreen}) {
  if (isFullscreen) return null;

  return (
    <header className="h-[48px] gh-header gh-text-primary flex items-center justify-between border-b border-dashed border-gray-600">
      <h1 className="ml-3 font-bold"> Recho Melody </h1>
      <button
        onClick={onToggleFullscreen}
        className="mr-4 p-2 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
        aria-label="Toggle fullscreen"
      >
        <Maximize className="w-5 h-5" />
      </button>
    </header>
  );
}
