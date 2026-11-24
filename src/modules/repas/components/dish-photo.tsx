/* eslint-disable @next/next/no-img-element -- private photos served by our own route (versioned URL), no image optimiser */

/** A dish photo, cropped to fill its box. */
export function DishPhoto({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={`object-cover ${className}`} />;
}
