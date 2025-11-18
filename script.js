function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function applyRandomSizeToImage(img) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const isLarge = nw >= vw || nh >= vh;

  if (isLarge) {
    const scale = randBetween(0.3, 0.7);
    const ar = nw / nh;
    if (nw / vw >= nh / vh) {
      const widthPx = Math.round(vw * scale);
      img.style.width = widthPx + "px";
      img.style.height = "auto";
    } else {
      const heightPx = Math.round(vh * scale);
      img.style.height = heightPx + "px";
      img.style.width = "auto";
    }
  } else {
    const scale = randBetween(0.4, 0.9);
    const widthPx = Math.round(nw * scale);
    img.style.width = widthPx + "px";
    img.style.height = "auto";
  }

  img.style.objectFit = "contain";
}

async function loadImagesFromAssets() {
  console.log("🚀 Starting loadImagesFromAssets function");

  try {
    // Enable debug overlay when URL contains ?debug=1
    const DEBUG_LAYOUT =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("debug");

    // small helper: debounce
    function debounce(fn, wait) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    }
    // Fetch image list from the server (may return array of strings or array of objects like {url: "..."})
    const imagesRequest = await fetch("/api/get-images");
    const response = await imagesRequest.json();

    // Normalize response into an array of URL strings
    let imageList = [];
    if (Array.isArray(response)) {
      imageList = response
        .map((it) => {
          if (!it) return null;
          if (typeof it === "string") return it;
          if (typeof it === "object")
            return it.url || it.secure_url || it.path || null;
          return null;
        })
        .filter(Boolean);
    } else if (response && typeof response === "object") {
      // handle wrapped responses like { images: [...] }
      const arr = response.images || response.results || [];
      if (Array.isArray(arr)) {
        imageList = arr
          .map((it) =>
            typeof it === "string"
              ? it
              : it.url || it.secure_url || it.path || null
          )
          .filter(Boolean);
      }
    }

    console.log("📄 Received image list:", imageList);

    // Sort imageList by date in filename (YYYY-MM-DD)
    imageList.sort((a, b) => {
      const dateA = a.match(/(\d{4}-\d{2}-\d{2})/);
      const dateB = b.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateA && dateB) {
        return dateA[1].localeCompare(dateB[1]);
      }
      return a.localeCompare(b);
    });
    // Collage-style randomized positioning for multi-image sections
    function applyRandomPositioning(images, container) {
      if (!images || images.length === 0) return;

      const section = container.closest && container.closest(".date-section");
      const sectionHeight =
        (section && section.clientHeight) || window.innerHeight;

      // ensure container is positioned and sized to the section
      container.style.position = container.style.position || "relative";
      container.style.height = sectionHeight + "px";
      container.style.overflow = "hidden";
      if (section) section.style.overflow = "hidden";

      const cs = window.getComputedStyle(container);
      const paddingTop = parseFloat(cs.paddingTop) || 0;
      const paddingBottom = parseFloat(cs.paddingBottom) || 0;
      const paddingSide = 16;
      const availableHeight = Math.max(
        40,
        sectionHeight - paddingTop - paddingBottom
      );
      const sectionWidth =
        (section && section.clientWidth) ||
        container.clientWidth ||
        window.innerWidth;

      // only apply collage/randomized behavior when more than one image
      const imageCount = images.length;
      const multi = imageCount > 1;

      // For small screens, prefer a simple stacked column to avoid cropping and
      // give each image full width in the flow. This is intended for phones.
      const isMobile =
        typeof window !== "undefined" &&
        (window.innerWidth <= 768 ||
          ((section && section.clientWidth) || container.clientWidth) < 600);
      if (isMobile) {
        // stacked column but with randomized small offsets (no rotation) and no padding
        // For multi-image sections we no longer force full-width images: instead
        // size each image based on the rules you requested and shrink sizes as
        // the image count grows. Single-image sections keep full-width behavior.
        container.classList.add("single-column");
        container.style.height = "auto";
        container.style.overflow = "visible";
        // remove any gap/padding so images touch edges if desired
        container.style.gap = "0px";

        // derive a count-driven scale so more images => smaller targets
        let countScale;
        if (imageCount <= 1) countScale = 1;
        else if (imageCount <= 4) countScale = 0.88;
        else if (imageCount <= 9) countScale = 0.68;
        else countScale = Math.max(0.32, 1.0 / Math.sqrt(imageCount));

        // We'll spread images horizontally around a baseline so they don't
        // simply stack vertically. Alternate placement left/right and add
        // randomized offsets while clamping to the container width.
        const vw = window.innerWidth;
        const baselineY = paddingTop + Math.round(availableHeight * 0.15);
        const flowSpacing = Math.max(12, Math.round((sectionWidth || vw) / 8));

        images.forEach((img, idx) => {
          img.style.position = "relative"; // keep in flow but we'll offset via transform
          img.style.left = "";
          img.style.top = "";
          img.style.height = "auto";
          img.style.boxSizing = "border-box";

          const nw = img.naturalWidth || img.width || 400;
          const nh = img.naturalHeight || img.height || 300;
          const isLargeImg = nw >= vw || nh >= window.innerHeight;

          if (imageCount === 1) {
            // keep full-width single-image behavior
            img.style.width = "100%";
            img.style.maxWidth = "100%";
            img.style.margin = "0";
          } else {
            if (isLargeImg) {
              const pct = Math.min(
                0.8,
                Math.max(0.3, randBetween(0.3, 0.8) * countScale)
              );
              const widthPx = Math.round(vw * pct);
              img.style.width = widthPx + "px";
              img.style.maxWidth = "100%";
            } else {
              const scale = Math.min(
                0.9,
                Math.max(0.4, randBetween(0.4, 0.9) * countScale)
              );
              const widthPx = Math.round(nw * scale);
              const finalWidth = Math.min(widthPx, Math.round(vw * 0.95));
              img.style.width = finalWidth + "px";
              img.style.maxWidth = "100%";
            }
            img.style.margin = "6px 0";
          }

          // Determine an x-offset that spreads images horizontally.
          // Alternate sides and scale offset by index to create a fanning layout.
          const idxSide = idx % 2 === 0 ? 1 : -1;
          const baseOffset = Math.round(flowSpacing * Math.ceil((idx + 1) / 2));
          const jitterX = Math.round(
            randBetween(-flowSpacing * 0.4, flowSpacing * 0.4)
          );
          let dx = idxSide * baseOffset + jitterX;

          // small vertical jitter too, but keep images generally near the baseline
          const dy = Math.round(randBetween(-12, 18));

          // Clamp horizontal movement so the image remains visible inside section
          const imgW = parseInt(img.style.width, 10) || nw;
          const centerX = Math.round(sectionWidth / 2);
          let finalLeft = centerX - Math.round(imgW / 2) + dx;
          finalLeft = Math.max(8, Math.min(sectionWidth - imgW - 8, finalLeft));

          // We'll use transform to shift while keeping images in-flow.
          const shiftX = finalLeft - (centerX - Math.round(imgW / 2));
          img.style.transform = `translate(${shiftX}px, ${dy}px)`;
          img.style.zIndex = 20 + Math.round(randBetween(0, 40));
        });

        return;
      }

      // count-driven base scale: more images => smaller base size
      let countScale;
      if (imageCount <= 1) {
        countScale = 1;
      } else if (imageCount <= 4) {
        countScale = 0.82;
      } else if (imageCount <= 9) {
        countScale = 0.6;
      } else {
        countScale = Math.max(0.28, 1.12 / Math.sqrt(imageCount));
      }
      countScale = Math.max(0.22, Math.min(1, countScale));

      // Build items using natural sizes and set explicit px sizes for stable measurements
      const items = images.map((img) => {
        const nw = img.naturalWidth || img.width || 300;
        const nh = img.naturalHeight || img.height || 200;

        // initial scale to fit within section width and available height
        let scale = Math.min(
          1,
          (sectionWidth - paddingSide * 2) / nw,
          availableHeight / nh
        );

        // apply count-driven downscaling and randomized jitter per image
        const jitterScale = multi
          ? randBetween(0.82, 1.08)
          : randBetween(0.92, 1);
        scale = Math.max(0.2, Math.min(1.1, scale * countScale * jitterScale));

        let w = Math.max(24, Math.round(nw * scale));
        let h = Math.max(24, Math.round(nh * scale));

        // assign explicit sizes and small random rotation for collage feel
        img.style.width = w + "px";
        img.style.height = h + "px";
        img.style.boxSizing = "border-box";
        // Use 'contain' to avoid cropping; keeps whole image visible inside its box
        img.style.objectFit = "contain";
        img.style.position = "absolute";
        img.style.visibility = "visible";

        // Do not rotate images — keep them straight for a cleaner collage
        img.style.transform = "none";

        return { img, w, h };
      });

      // introduce randomness in ordering/sorting so each render differs
      if (multi) {
        const layoutMode = Math.random() < 0.28 ? "free" : "masonry";

        if (Math.random() < 0.5) {
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
          }
        } else {
          items.sort((a, b) => b.h - a.h + randBetween(-18, 18));
        }

        if (layoutMode === "masonry") {
          const maxColsByWidth = Math.max(1, Math.floor(sectionWidth / 220));
          const maxCols = Math.min(items.length, Math.max(1, maxColsByWidth));
          let chosenCols = 1;
          let bestMaxH = Infinity;
          for (let tryCols = 1; tryCols <= maxCols; tryCols++) {
            const testHeights = new Array(tryCols).fill(0);
            for (const it of items) {
              let ci = 0;
              for (let c = 1; c < tryCols; c++)
                if (testHeights[c] < testHeights[ci]) ci = c;
              testHeights[ci] += it.h + randBetween(8, 18);
            }
            const maxH = Math.max(...testHeights);
            if (maxH <= availableHeight) {
              chosenCols = tryCols;
              bestMaxH = maxH;
              break;
            }
            if (maxH < bestMaxH) {
              chosenCols = tryCols;
              bestMaxH = maxH;
            }
          }

          const cols = Math.max(1, chosenCols);
          const innerWidth = Math.max(200, sectionWidth - paddingSide * 2);
          const colWidth = Math.floor(innerWidth / cols);
          const colHeights = new Array(cols).fill(0);
          const placed = [];

          items.forEach(({ img }, idx) => {
            let w = parseInt(img.style.width, 10) || img.offsetWidth || 100;
            let h = parseInt(img.style.height, 10) || img.offsetHeight || 80;

            if (multi && Math.random() < 0.25) {
              const narrow = randBetween(0.82, 0.96);
              w = Math.max(24, Math.round(w * narrow));
              h = Math.max(24, Math.round(h * narrow));
              img.style.width = w + "px";
              img.style.height = h + "px";
            }

            if (w > colWidth * 0.97) {
              const s = (colWidth * 0.97) / w;
              w = Math.max(24, Math.round(w * s));
              h = Math.max(24, Math.round(h * s));
              img.style.width = w + "px";
              img.style.height = h + "px";
            }

            let col = 0;
            for (let c = 1; c < cols; c++)
              if (colHeights[c] + randBetween(-8, 8) < colHeights[col]) col = c;

            const jitterX = Math.round(
              randBetween(
                -Math.min(16, colWidth * 0.12),
                Math.min(16, colWidth * 0.12)
              )
            );
            let x =
              paddingSide +
              col * colWidth +
              Math.round((colWidth - w) / 2) +
              jitterX;
            x = Math.max(
              paddingSide,
              Math.min(sectionWidth - paddingSide - w, x)
            );

            const jitterY = Math.round(randBetween(-10, 10));
            let y = paddingTop + colHeights[col] + jitterY;

            if (y + h > paddingTop + availableHeight) {
              const remaining =
                paddingTop + availableHeight - colHeights[col] - paddingTop - 4;
              if (remaining > 40) {
                const s2 = Math.min(1, Math.max(24 / h, remaining / h));
                h = Math.max(24, Math.round(h * s2));
                w = Math.max(24, Math.round(w * s2));
                img.style.width = w + "px";
                img.style.height = h + "px";
              }
              y = Math.max(paddingTop, paddingTop + availableHeight - h);
            }

            img.style.left = x + "px";
            img.style.top = y + "px";
            img.style.zIndex = 10 + Math.round(randBetween(0, 30));

            placed.push({ x, y, w, h, img, col });
            colHeights[col] += h + Math.round(randBetween(8, 20));
          });

          function overlapArea(a, b) {
            const xO = Math.max(
              0,
              Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
            );
            const yO = Math.max(
              0,
              Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
            );
            return xO * yO;
          }
          const maxOverlapRatio = 0.22;
          for (let pass = 0; pass < 4; pass++) {
            let moved = false;
            for (let i = 0; i < placed.length; i++) {
              for (let j = i + 1; j < placed.length; j++) {
                const A = placed[i];
                const B = placed[j];
                const ov = overlapArea(A, B);
                if (ov <= 0) continue;
                const smaller = Math.min(A.w * A.h, B.w * B.h);
                if (ov / smaller <= maxOverlapRatio) continue;
                let dx = B.x + B.w / 2 - (A.x + A.w / 2);
                let dy = B.y + B.h / 2 - (A.y + A.h / 2);
                if (dx === 0 && dy === 0) {
                  dx = randBetween(-1, 1);
                  dy = randBetween(-1, 1);
                }
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const push = Math.min(48, (ov / smaller) * 60);
                const nx = Math.round((dx / d) * push);
                const ny = Math.round((dy / d) * push);
                B.x = Math.max(
                  paddingSide,
                  Math.min(sectionWidth - paddingSide - B.w, B.x + nx)
                );
                B.y = Math.max(
                  paddingTop,
                  Math.min(paddingTop + availableHeight - B.h, B.y + ny)
                );
                if (B.img) {
                  B.img.style.left = B.x + "px";
                  B.img.style.top = B.y + "px";
                }
                moved = true;
              }
            }
            if (!moved) break;
          }
        } else {
          // free collage mode
          const placed = [];
          items.forEach(({ img, w, h }, idx) => {
            let x = Math.round(
              randBetween(paddingSide, sectionWidth - paddingSide - w)
            );
            let y = Math.round(
              randBetween(paddingTop, paddingTop + availableHeight - h)
            );
            if (idx === 0 && Math.random() < 0.6) {
              x = Math.round((sectionWidth - w) / 2 + randBetween(-40, 40));
              y = Math.round(paddingTop + randBetween(8, 40));
            }
            img.style.left = x + "px";
            img.style.top = y + "px";
            img.style.zIndex = 10 + Math.round(randBetween(0, 40));
            placed.push({ x, y, w, h, img });
          });
          function overlapArea(a, b) {
            const xO = Math.max(
              0,
              Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
            );
            const yO = Math.max(
              0,
              Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
            );
            return xO * yO;
          }
          const maxOverlapRatio = 0.28;
          for (let pass = 0; pass < 5; pass++) {
            let moved = false;
            for (let i = 0; i < placed.length; i++) {
              for (let j = i + 1; j < placed.length; j++) {
                const A = placed[i];
                const B = placed[j];
                const ov = overlapArea(A, B);
                if (ov <= 0) continue;
                const smaller = Math.min(A.w * A.h, B.w * B.h);
                if (ov / smaller <= maxOverlapRatio) continue;
                let dx = B.x + B.w / 2 - (A.x + A.w / 2);
                let dy = B.y + B.h / 2 - (A.y + A.h / 2);
                if (dx === 0 && dy === 0) {
                  dx = randBetween(-1, 1);
                  dy = randBetween(-1, 1);
                }
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const push = Math.min(64, (ov / smaller) * 80);
                const nx = Math.round((dx / d) * push);
                const ny = Math.round((dy / d) * push);
                B.x = Math.max(
                  paddingSide,
                  Math.min(sectionWidth - paddingSide - B.w, B.x + nx)
                );
                B.y = Math.max(
                  paddingTop,
                  Math.min(paddingTop + availableHeight - B.h, B.y + ny)
                );
                if (B.img) {
                  B.img.style.left = B.x + "px";
                  B.img.style.top = B.y + "px";
                }
                moved = true;
              }
            }
            if (!moved) break;
          }
        }
      } else {
        // single-image fallback: center
        const img = items[0] && items[0].img;
        if (img) {
          const w = parseInt(img.style.width, 10) || img.offsetWidth || 100;
          const h = parseInt(img.style.height, 10) || img.offsetHeight || 80;
          const x = Math.max(paddingSide, Math.round((sectionWidth - w) / 2));
          const y = Math.max(
            paddingTop,
            Math.round((availableHeight - h) / 2 + paddingTop)
          );
          img.style.left = x + "px";
          img.style.top = y + "px";
          img.style.zIndex = 20;
        }
      }

      // ensure container stays the section width and height
      container.style.minWidth = "100%";
      container.style.maxWidth = "100%";
      container.style.height = sectionHeight + "px";

      // Debug overlay handled below
    }

    // Group images by date (basename/date extraction)
    const imagesByDate = {};
    function basename(path) {
      try {
        return path.split("/").pop();
      } catch (e) {
        return path;
      }
    }

    imageList.forEach((urlOrPath) => {
      const name = basename(urlOrPath);
      let m = name.match(/(\d{4}-\d{2}-\d{2})/);
      if (!m) m = name.match(/(\d{4}_\d{2}_\d{2})/);
      if (!m) {
        m = name.match(/(\d{8})/);
        if (m) {
          const s = m[1];
          m = [s, `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`];
        }
      }
      const d = m
        ? m[1]
          ? m[1].replace(/_/g, "-")
          : m[0].replace(/_/g, "-")
        : "undated";
      imagesByDate[d] = imagesByDate[d] || [];
      imagesByDate[d].push(urlOrPath);
    });

    // load optional texts.json and group by date
    const textsByDate = {};
    try {
      const tResp = await fetch("assets/texts.json");
      if (tResp.ok) {
        const texts = await tResp.json();
        (texts || []).forEach((t) => {
          if (t && t.date) {
            const key = String(t.date).trim();
            textsByDate[key] = textsByDate[key] || [];
            textsByDate[key].push(t.content);
          }
        });
      }
    } catch (e) {
      // ignore missing texts.json
    }

    // helper: preload images for a date and return loaded <img> elements
    function preloadImagesForDate(imageUrls) {
      const promises = (imageUrls || []).map((urlOrPath) => {
        return new Promise((resolve) => {
          const img = new Image();
          const filename = basename(urlOrPath);
          img.onload = function () {
            img.dataset.filename = filename;
            img.alt = `Image ${filename}`;
            img.loading = "lazy";
            resolve(img);
          };
          img.onerror = function () {
            console.warn("Failed to load image", urlOrPath);
            resolve(null);
          };
          img.src = urlOrPath;
        });
      });
      return Promise.all(promises).then((results) => results.filter(Boolean));
    }

    // render one date section (texts + images)
    async function renderDateSection(date, imageUrls, texts) {
      const section = document.createElement("section");
      section.className = "date-section";
      section.dataset.date = date;

      const header = document.createElement("div");
      header.className = "date-section-header";
      const dateSpan = document.createElement("span");
      dateSpan.className = "date-section-date";
      dateSpan.textContent = date;
      const extraSpan = document.createElement("span");
      extraSpan.className = "date-section-label-extra";
      header.appendChild(dateSpan);
      header.appendChild(extraSpan);
      section.appendChild(header);

      if (texts && texts.length) {
        const textBox = document.createElement("div");
        textBox.className = "date-section-texts";
        texts.forEach((t) => {
          const p = document.createElement("p");
          p.textContent = t;
          textBox.appendChild(p);
        });
        section.appendChild(textBox);
      }

      if (imageUrls && imageUrls.length) {
        const imagesContainer = document.createElement("div");
        imagesContainer.className = "date-section-images";

        const loadedImages = await preloadImagesForDate(imageUrls);

        if (loadedImages.length === 1) {
          imagesContainer.classList.add("single-image");
          loadedImages.forEach((img) => imagesContainer.appendChild(img));
        } else if (loadedImages.length > 1) {
          loadedImages.forEach((img) => {
            applyRandomSizeToImage(img);
            imagesContainer.appendChild(img);
          });
          requestAnimationFrame(() =>
            applyRandomPositioning(loadedImages, imagesContainer)
          );
        }

        section.appendChild(imagesContainer);
      }

      return section;
    }

    // render all date sections in chronological order
    const allDates = Array.from(
      new Set(Object.keys(imagesByDate).concat(Object.keys(textsByDate || {})))
    ).sort();

    const gallery = document.getElementById("image-gallery");
    if (gallery) {
      gallery.innerHTML = "";
      for (const date of allDates) {
        // eslint-disable-next-line no-await-in-loop
        const section = await renderDateSection(
          date,
          imagesByDate[date] || [],
          textsByDate[date] || []
        );
        gallery.appendChild(section);
      }

      // try to center on today or last
      setTimeout(() => {
        try {
          const today = getLocalISODate();
          const todaySection = document.querySelector(
            `.date-section[data-date="${today}"]`
          );
          if (todaySection) {
            scrollToDate(today);
          } else if (allDates.length) {
            scrollToDate(allDates[allDates.length - 1]);
          }
        } catch (e) {
          // ignore
        }
      }, 150);
    }

    // Expose a small reflow utility and handle window resize to re-run layout
    function reflowAllDateImageContainers() {
      const containers = document.querySelectorAll(".date-section-images");
      containers.forEach((c) => {
        if (c.classList.contains("single-image")) return;
        const imgs = Array.from(c.querySelectorAll("img"));
        if (imgs.length > 1) applyRandomPositioning(imgs, c);
      });
    }

    const debouncedReflow = debounce(() => {
      try {
        reflowAllDateImageContainers();
      } catch (e) {}
    }, 180);

    if (typeof window !== "undefined") {
      window.addEventListener("resize", debouncedReflow);
      // Also attempt a reflow after images have had time to settle
      setTimeout(reflowAllDateImageContainers, 500);
    }
  } catch (error) {
    console.error("Error loading images:", error);
  }
}

// Helper: get today's date in local time as YYYY-MM-DD
function getLocalISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: find the nearest horizontal scrollable ancestor of an element
function getHorizontalScrollParent(el) {
  let parent = el.parentElement;
  while (
    parent &&
    parent !== document.body &&
    parent !== document.documentElement
  ) {
    const style = window.getComputedStyle(parent);
    const overflowX = style.overflowX;
    if (overflowX === "auto" || overflowX === "scroll") return parent;
    parent = parent.parentElement;
  }
  // Fallback to the main scrolling element (page-level scroll)
  return document.scrollingElement || document.documentElement;
}

// Helper: center horizontally on a date-section by date string (YYYY-MM-DD)
function scrollToDate(date) {
  try {
    const section = document.querySelector(
      `.date-section[data-date="${date}"]`
    );
    if (!section) return;

    const parent = getHorizontalScrollParent(section);
    const parentRect = parent.getBoundingClientRect();
    const rect = section.getBoundingClientRect();

    if (parent === (document.scrollingElement || document.documentElement)) {
      // Page-level scroll
      const scrollX =
        window.scrollX + rect.left - window.innerWidth / 2 + rect.width / 2;
      window.scrollTo({ left: scrollX, behavior: "smooth" });
    } else {
      // Element-level horizontal scroll inside a container
      const offsetLeft = rect.left - parentRect.left + parent.scrollLeft;
      const target = Math.max(
        0,
        offsetLeft - parent.clientWidth / 2 + rect.width / 2
      );
      parent.scrollTo({ left: target, behavior: "smooth" });
    }
  } catch (e) {
    // ignore
  }
}

// Helper: center horizontally on today's section (using local date)
function scrollToTodaysDate() {
  try {
    const today = getLocalISODate();
    scrollToDate(today);
  } catch (e) {
    // ignore
  }
}

document.addEventListener("DOMContentLoaded", loadImagesFromAssets);
