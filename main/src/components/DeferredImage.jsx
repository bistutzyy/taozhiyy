import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

const DeferredImage = forwardRef(function DeferredImage({ src, ...props }, ref) {
  const nodeRef = useRef(null);
  const [active, setActive] = useState(false);
  const assignRef = useCallback((node) => {
    nodeRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setActive(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setActive(true);
        observer.disconnect();
      }
    }, { rootMargin: "280px 0px", threshold: 0.01 });
    if (nodeRef.current) observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, []);

  return <img {...props} ref={assignRef} src={active ? src : undefined} decoding="async" />;
});

export default DeferredImage;
