import { useEffect } from "react";

export function useBodyScrollLock() {
  useEffect(() => {
    const { body, documentElement } = document;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const properties = ["position", "top", "left", "width", "overflow", "padding-right"];
    const previous = properties.map((property) => ({
      property,
      value: body.style.getPropertyValue(property),
      priority: body.style.getPropertyPriority(property),
    }));
    const rootOverflow = documentElement.style.getPropertyValue("overflow");
    const rootOverflowPriority = documentElement.style.getPropertyPriority("overflow");
    const paddingRight = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;

    documentElement.style.setProperty("overflow", "hidden");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${paddingRight + scrollbarWidth}px`;

    return () => {
      for (const { property, value, priority } of previous) {
        if (value) body.style.setProperty(property, value, priority);
        else body.style.removeProperty(property);
      }
      if (rootOverflow) documentElement.style.setProperty("overflow", rootOverflow, rootOverflowPriority);
      else documentElement.style.removeProperty("overflow");
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    };
  }, []);
}
