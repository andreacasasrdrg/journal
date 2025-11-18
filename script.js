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

    // Fetch texts.json (optional) and group by date
    let textsByDate = {};
    try {
      const tResp = await fetch("assets/texts.json");
      if (tResp.ok) {
        const texts = await tResp.json();
        texts.forEach((t) => {
          if (t && t.date) {
            const key = String(t.date).trim();
            textsByDate[key] = textsByDate[key] || [];
            textsByDate[key].push(t.content);
          }
        });
      }
    } catch (e) {
      console.warn("Could not load texts.json", e);
    }

    // Prepare gallery for new layout (styling handled mostly via CSS)
    const gallery = document.getElementById("image-gallery");
    gallery.innerHTML = "";

    // Helper to get a basename from a URL/path
    function basename(path) {
      try {
        return path.split("/").pop();
      } catch (e) {
        return path;
      }
    }

    // Build imagesByDate mapping. imageList items are full URLs or local paths.
    const imagesByDate = {};
    imageList.forEach((urlOrPath) => {
      const name = basename(urlOrPath);
      // Normalize to look for YYYY-MM-DD, YYYY_MM_DD or 8-digit date inside the filename
      let m = name.match(/(\d{4}-\d{2}-\d{2})/);
      if (!m) m = name.match(/(\d{4}_\d{2}_\d{2})/);
      if (!m) {
        // try to find patterns like 20251103
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

    // Combine dates from images and texts, sort ascending (chronological)
    const allDates = Array.from(
      new Set(Object.keys(imagesByDate).concat(Object.keys(textsByDate || {})))
    ).sort();

    // Helper: preload all images for a given date and return the loaded <img> elements
    function preloadImagesForDate(imageUrls) {
      const promises = imageUrls.map((urlOrPath) => {
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

      return Promise.all(promises).then((results) =>
        results.filter((img) => img !== null)
      );
    }

    // Helper: render a single date section with its texts and images (after preloading)
    async function renderDateSection(date, imageUrls, texts) {
      const section = document.createElement("section");
      section.className = "date-section";
      section.dataset.date = date;

      // Header with date label
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

      // Texts box for this date
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

      // Images grid for this date (preload before appending)
      if (imageUrls && imageUrls.length) {
        const imagesContainer = document.createElement("div");
        imagesContainer.className = "date-section-images";

        const loadedImages = await preloadImagesForDate(imageUrls);

        if (loadedImages.length === 1) {
          // Single image for this date: let it use natural size,
          // with CSS constraining it to the section width.
          imagesContainer.classList.add("single-image");
        } else if (loadedImages.length > 1) {
          // Multiple images: apply random viewport/natural-based sizing
          loadedImages.forEach((img) => applyRandomSizeToImage(img));
        }

        loadedImages.forEach((img) => {
          imagesContainer.appendChild(img);
        });

        section.appendChild(imagesContainer);
      }

      return section;
    }

    // Render each date section in chronological order, left-to-right, waiting
    for (const date of allDates) {
      const section = await renderDateSection(
        date,
        imagesByDate[date] || [],
        textsByDate[date] || []
      );
      gallery.appendChild(section);
    }

    // After rendering, attempt to center today's date (or latest) section
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
        console.warn("scrollToDate initial alignment failed", e);
      }
    }, 150);
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
