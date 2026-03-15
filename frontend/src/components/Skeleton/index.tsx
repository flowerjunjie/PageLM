type Props = {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  count?: number;
};

export default function Skeleton({ className = "", variant = "rectangular", count = 1 }: Props) {
  const getSkeletonClass = () => {
    switch (variant) {
      case "text":
        return "h-4 w-3/4 rounded";
      case "circular":
        return "h-12 w-12 rounded-full";
      case "rectangular":
        return "h-16 w-full rounded-lg";
      default:
        return "h-16 w-full rounded-lg";
    }
  };

  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${getSkeletonClass()} bg-stone-800/50`}
        />
      ))}
    </div>
  );
}
