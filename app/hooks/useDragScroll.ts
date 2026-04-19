import { useRef, useCallback } from "react";

export function useDragScroll() {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    isDragging.current = true;
    startX.current = e.pageX - e.currentTarget.offsetLeft;
    scrollLeft.current = e.currentTarget.scrollLeft;
    e.currentTarget.style.cursor = "grabbing";
    e.currentTarget.style.userSelect = "none";
  }, []);

  const onMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    isDragging.current = false;
    e.currentTarget.style.cursor = "grab";
    e.currentTarget.style.userSelect = "";
  }, []);

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLElement>) => {
    isDragging.current = false;
    e.currentTarget.style.cursor = "grab";
    e.currentTarget.style.userSelect = "";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - e.currentTarget.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    e.currentTarget.scrollLeft = scrollLeft.current - walk;
  }, []);

  return {
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onMouseMove,
    style: { cursor: "grab" } as React.CSSProperties,
  };
}
