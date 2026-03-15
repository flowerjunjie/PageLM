import { useState, useRef } from "react";

type Props = {
  content: string;
  children: React.ReactElement;
  delay?: number;
  placement?: "top" | "bottom" | "left" | "right";
};

export default function Tooltip({ content, children, delay = 500, placement = "top" }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const getPositionClasses = () => {
    switch (placement) {
      case "top":
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
      default:
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
    }
  };

  const getArrowClasses = () => {
    switch (placement) {
      case "top":
        return "top-full left-1/2 -translate-x-1/2 -mt-1 border-l-stone-700 border-r-stone-700 border-b-stone-700";
      case "bottom":
        return "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l-stone-700 border-r-stone-700 border-t-stone-700";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 -mr-1 border-t-stone-700 border-b-stone-700 border-r-stone-700";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 -ml-1 border-t-stone-700 border-b-stone-700 border-l-stone-700";
      default:
        return "top-full left-1/2 -translate-x-1/2 -mt-1 border-l-stone-700 border-r-stone-700 border-b-stone-700";
    }
  };

  const getArrowRotation = () => {
    switch (placement) {
      case "top":
        return "rotate-45";
      case "bottom":
        return "rotate-45";
      case "left":
        return "rotate-45";
      case "right":
        return "rotate-45";
      default:
        return "rotate-45";
    }
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 px-3 py-1.5 bg-stone-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap ${getPositionClasses()}`}
        >
          {content}
          <div
            className={`absolute w-2 h-2 border-4 border-transparent ${getArrowClasses()} ${getArrowRotation()}`}
          />
        </div>
      )}
    </div>
  );
}
