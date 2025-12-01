// src/front/js/component/SearchBar.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../styles/searchBar.css";

const DEFAULT_DEBOUNCE = 80;
const safeArray = (v) => (Array.isArray(v) ? v : []);

const SearchBar = ({ products = [], resetKey = null }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // refs for timers + mounted guard
  const debounceTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debounceMs] = useState(DEFAULT_DEBOUNCE);

  const sourceProducts = useMemo(() => safeArray(products), [products]);

  // mounted guard: track mount/unmount and clear timers
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const computeFiltered = (q) => {
    const text = (q || "").trim().toLowerCase();
    if (!text) return [];
    const results = [];
    for (let i = 0; i < sourceProducts.length; i++) {
      const p = sourceProducts[i];
      if (!p) continue;
      const name = ((p.name || p.title || p.product_name || p.description) + "").toLowerCase();
      if (name.includes(text)) {
        results.push(p);
        if (results.length >= 8) break;
      }
    }
    return results;
  };

  // Debounced compute on typing (with safe cleanup)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      if (!query) {
        if (mountedRef.current) {
          setFiltered([]);
          setActiveIndex(-1);
          window.__debugFilteredCount = 0;
        }
        return;
      }
      const res = computeFiltered(query);
      if (mountedRef.current) {
        setFiltered(res);
        setActiveIndex(-1);
        window.__debugFilteredCount = res.length;
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query, debounceMs, sourceProducts]);

  // Recompute immediately when product list changes
  useEffect(() => {
    if (!query) {
      if (mountedRef.current) {
        setFiltered([]);
        setActiveIndex(-1);
        window.__debugFilteredCount = 0;
      }
      return;
    }
    const res = computeFiltered(query);
    if (mountedRef.current) {
      setFiltered(res);
      setActiveIndex(-1);
      window.__debugFilteredCount = res.length;
    }
  }, [sourceProducts]); // eslint-disable-line

  // Recompute on focus even if query unchanged
  useEffect(() => {
    if (isFocused && query) {
      const res = computeFiltered(query);
      if (mountedRef.current) {
        setFiltered(res);
        setActiveIndex(-1);
        window.__debugFilteredCount = res.length;
      }
    }
  }, [isFocused]); // eslint-disable-line

  // Reset only when navigation goes to a productDetails route
  useEffect(() => {
    if (typeof resetKey !== "string") return;
    if (resetKey.startsWith("/productDetails")) {
      try { inputRef.current && inputRef.current.blur(); } catch (e) {}
      if (mountedRef.current) {
        setQuery("");
        setFiltered([]);
        setActiveIndex(-1);
        setIsFocused(false);
        window.__debugFilteredCount = 0;
      }
    }
  }, [resetKey]);

  // Click outside -> close dropdown
  useEffect(() => {
    const onDoc = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (mountedRef.current) setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsFocused(false);
      return;
    }
    if (!filtered.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= filtered.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = activeIndex >= 0 ? filtered[activeIndex] : filtered[0];
      if (sel) navigateToProduct(sel);
    }
  };

  const closeOpenOffcanvas = () => {
    try {
      if (window.bootstrap && typeof window.bootstrap.Offcanvas === "function") {
        document.querySelectorAll(".offcanvas.show").forEach((el) => {
          const inst = window.bootstrap.Offcanvas.getInstance(el) || new window.bootstrap.Offcanvas(el);
          try { inst.hide(); } catch (e) { /* ignore */ }
        });
      } else {
        document.querySelectorAll(".offcanvas.show").forEach((el) => {
          el.classList.remove("show");
          el.style.visibility = "hidden";
        });
        document.querySelectorAll(".offcanvas-backdrop").forEach((b) => b.parentNode && b.parentNode.removeChild(b));
      }
    } catch (err) {
      // non-fatal
    }
  };

  // IMPORTANT: immediate clear BEFORE navigate to avoid setState after unmount
  const navigateToProduct = (item) => {
    if (!item) return;
    const id = item.id ?? item.product_id ?? item.productId ?? item.slug;
    if (!id) return;

    // close offcanvas + blur
    closeOpenOffcanvas();
    try { inputRef.current && inputRef.current.blur(); } catch (e) {}

    // Immediate synchronous clear of local state (while component still mounted)
    try {
      setQuery("");
      setFiltered([]);
      setActiveIndex(-1);
      setIsFocused(false);
      window.__debugFilteredCount = 0;
    } catch (e) {
      // ignore
    }

    // Now navigate (no delayed setState afterwards)
    navigate(`/productDetails/${id}`);
  };

  const escapeRegExp = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const highlightMatch = (name = "") => {
    if (!query) return name;
    try {
      const rx = new RegExp(`(${escapeRegExp(query)})`, "ig");
      return name.replace(rx, "<mark>$1</mark>");
    } catch {
      return name;
    }
  };

  return (
    <div className="search-bar-container" ref={containerRef} style={{ minWidth: 220 }}>
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Buscar productos..."
        value={query}
        onChange={(e) => {
          // immediate set query + ensure focused
          setQuery(e.target.value);
          setIsFocused(true);
        }}
        onFocus={() => {
          setIsFocused(true);
          if (query) {
            const res = computeFiltered(query);
            if (mountedRef.current) {
              setFiltered(res);
              setActiveIndex(-1);
              window.__debugFilteredCount = res.length;
            }
          }
        }}
        onKeyDown={handleKeyDown}
        aria-label="Buscar productos"
        autoComplete="off"
      />

      {isFocused && filtered.length > 0 && (
        <ul className="search-dropdown" role="listbox">
          {filtered.map((item, index) => {
            const key = item.id ?? item.product_id ?? index;
            const name = item.name ?? item.title ?? item.product_name ?? "";
            return (
              <li
                key={key}
                className={`search-item ${index === activeIndex ? "active" : ""}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                <Link
                  to={`/productDetails/${item.id ?? item.product_id ?? item.productId ?? item.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToProduct(item);
                  }}
                  dangerouslySetInnerHTML={{
                    __html: `<img src="${item.img || ""}" class="search-item-img" alt="${name}" /> ${highlightMatch(name)}`,
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
