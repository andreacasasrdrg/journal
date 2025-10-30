async function loadImagesFromAssets() {
  console.log("🚀 Starting loadImagesFromAssets function");
  console.log("🚀 Starting loadImagesFromAssets function");

  try {
    // Fetch the image list from the JSON file
    console.log("📡 Fetching assets/images.json...");
    const response = await fetch("assets/images.json");
    console.log("📡 Response status:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const imageList = await response.json();
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

    // Use the image list for advanced layout
    document.body.style.backgroundColor = "#2735F2";
    const gallery = document.getElementById("image-gallery");
    gallery.innerHTML = "";
    // Ensure gallery allows horizontal scrolling and hides vertical overflow
    gallery.style.overflowX = "auto"; // allow horizontal scrolling
    gallery.style.overflowY = "hidden"; // prevent vertical overflow
    gallery.style.boxSizing = "border-box";
    // Fix gallery height to viewport to prevent images rendering below the fold
    gallery.style.height = window.innerHeight + "px";

    // Variables for layout
    const sectionHeight = window.innerHeight;
    let occupiedAreas = [];
    let allImages = [];

    function getRandomBetween(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function isPositionOccupied(x, y, width, height) {
      const rect1 = { left: x, top: y, right: x + width, bottom: y + height };
      return occupiedAreas.some((rect2) => {
        return !(
          rect1.right <= rect2.left ||
          rect1.left >= rect2.right ||
          rect1.bottom <= rect2.top ||
          rect1.top >= rect2.bottom
        );
      });
    }

    function getRandomSizeWithAspectRatio(originalWidth, originalHeight) {
      // Original size bounds (we'll apply phone-scale later in repositionImage)
      const minSize = 120;
      const maxSize = 320;
      const scale = getRandomBetween(minSize, maxSize) / originalWidth;
      return {
        width: originalWidth * scale,
        height: originalHeight * scale,
      };
    }

    function findBestPosition(width, height) {
      const gridSize = 10;
      // Iterate horizontally first (x), then vertically (y) to create a horizontal flow
      for (let x = 0; x < window.innerWidth * 3; x += gridSize * 3) {
        for (let y = 0; y + height <= window.innerHeight; y += gridSize) {
          const verticalVariation = getRandomBetween(-30, 50);
          // Compute candidate Y and clamp so image stays inside viewport vertically
          let posYCandidate = Math.max(0, y + verticalVariation);
          const maxTop = Math.max(0, window.innerHeight - height);
          const posY = Math.min(posYCandidate, maxTop);
          if (!isPositionOccupied(x, posY, width, height)) {
            occupiedAreas.push({
              left: x,
              top: posY,
              right: x + width,
              bottom: posY + height,
            });
            return { x, y: posY };
          }
        }
      }
      // Fallback: random position within an extended horizontal span
      const randomX = getRandomBetween(
        0,
        Math.max(0, Math.floor(window.innerWidth * 3) - width)
      );
      const randomY = getRandomBetween(
        0,
        Math.max(0, window.innerHeight - height)
      );
      occupiedAreas.push({
        left: randomX,
        top: randomY,
        right: randomX + width,
        bottom: randomY + height,
      });
      return { x: randomX, y: randomY };
    }

    function repositionImage(img) {
      const originalWidth = img.naturalWidth || 200;
      const originalHeight = img.naturalHeight || 200;
      const { width, height } = getRandomSizeWithAspectRatio(
        originalWidth,
        originalHeight
      );
      // Cap width so it never exceeds the viewport (leave small padding)
      const maxAllowedWidth = Math.max(100, Math.floor(window.innerWidth - 20));
      let finalWidth = Math.min(width, maxAllowedWidth);
      const scale = finalWidth / width;
      let finalHeight = Math.round(height * scale);

      // If on a phone, reduce the resulting size by 20%
      if (window.innerWidth <= 480) {
        finalWidth = Math.round(finalWidth * 0.8);
        finalHeight = Math.round(finalHeight * 0.8);
      }

      img.style.width = finalWidth + "px";
      img.style.height = finalHeight + "px";
      const position = findBestPosition(finalWidth, finalHeight);
      img.style.left = position.x + "px";
      // Ensure image is not placed below the viewport
      const clampedTop = Math.min(
        Math.max(0, position.y),
        Math.max(0, window.innerHeight - finalHeight)
      );
      img.style.top = clampedTop + "px";
      // Update gallery width to ensure horizontal scroll can accommodate images
      const requiredWidth = position.x + finalWidth + 100;
      const currentWidth = parseInt(gallery.style.width) || window.innerWidth;
      if (requiredWidth > currentWidth) {
        gallery.style.width = requiredWidth + "px";
      }
      // Keep gallery height equal to viewport to avoid vertical expansion
      gallery.style.height = window.innerHeight + "px";
    }

    function repositionAllImages() {
      occupiedAreas = [];
      allImages.forEach((img) => repositionImage(img));
    }

    var resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        repositionAllImages();
      }, 250);
    });

    // Create images from JSON list
    let jsonImagesLoaded = 0;
    let scrolledToToday = false;
    imageList.forEach((filename, index) => {
      const img = document.createElement("img");
      img.src = `assets/${filename}`;
      img.dataset.filename = filename;
      img.alt = `Image ${index + 1}: ${filename}`;
      img.loading = "lazy";
      img.style.position = "absolute";
      img.style.objectFit = "cover";
      img.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
      // Make responsive: don't allow image to overflow horizontally
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.zIndex = index + 1;
      img.onerror = function () {
        this.style.display = "none";
      };
      img.onload = function () {
        repositionImage(this);
        allImages.push(this);
        jsonImagesLoaded++;

        // If this image's filename contains today's date and we haven't scrolled yet,
        // scroll immediately to center this image in the viewport.
        try {
          const today = new Date().toISOString().split("T")[0];
          const m = filename.match(/(\d{4}-\d{2}-\d{2})/);
          if (!scrolledToToday && m && m[1] === today) {
            scrolledToToday = true;
            const rect = this.getBoundingClientRect();
            const scrollY =
              window.scrollY +
              rect.top -
              window.innerHeight / 2 +
              rect.height / 2;
            window.scrollTo({ top: scrollY, behavior: "smooth" });
          }
        } catch (e) {
          // ignore
        }

        // After all images are loaded, fallback to scroll if we didn't already
        if (jsonImagesLoaded === imageList.length && !scrolledToToday) {
          scrollToTodaysDate();
        }
      };
      gallery.appendChild(img);
    });
    // Use the JSON manifest for infinite scroll and other flows (horizontal)
    console.log("Using JSON manifest for infinite scroll (imageList)");
    setupNaturalInfiniteScroll(imageList);
  } catch (error) {
    console.error("Error loading images:", error);
  }
}

// Setup natural infinite scroll - only adds images if there's empty space
function setupNaturalInfiniteScroll(imageFiles) {
  let isLoading = false;

  function handleScroll() {
    if (isLoading) return;

    // Horizontal scroll position checks
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;
    const windowWidth = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;

    // Only add more images if user has scrolled close to the right edge
    if (scrollLeft + windowWidth >= documentWidth - 200) {
      isLoading = true;
      console.log(`🔄 Adding more images to fill empty horizontal space...`);
      // Reset loading flag after a short delay
      setTimeout(() => {
        isLoading = false;
      }, 300);
    }
  }

  // Add scroll listener
  window.addEventListener("scroll", handleScroll);
  console.log("🌊 Natural infinite scroll setup complete!");
}

// Global variables for responsive layout
let allImages = [];
let occupiedAreas = [];
let sectionHeight;

// Global helper functions
function getRandomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomSizeWithAspectRatio(originalWidth, originalHeight) {
  const minSize = 100;
  const maxSize = 400;
  const aspectRatio = originalWidth / originalHeight;

  for (let attempts = 0; attempts < 10; attempts++) {
    const basedOnWidth = Math.random() > 0.5;
    let width, height;

    if (basedOnWidth) {
      width = getRandomBetween(minSize, maxSize);
      height = width / aspectRatio;
    } else {
      height = getRandomBetween(minSize, maxSize);
      width = height * aspectRatio;
    }

    if (
      width >= minSize &&
      width <= maxSize &&
      height >= minSize &&
      height <= maxSize
    ) {
      return { width, height };
    }
  }

  const targetSize = getRandomBetween(minSize, maxSize);
  if (aspectRatio > 1) {
    return { width: targetSize, height: targetSize / aspectRatio };
  } else {
    return { width: targetSize * aspectRatio, height: targetSize };
  }
}

// Load images when the DOM is ready
// Helper: center horizontally on today's image
function scrollToTodaysDate() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const match = allImages.find((img) => {
      const m =
        img.dataset.filename &&
        img.dataset.filename.match(/(\d{4}-\d{2}-\d{2})/);
      return m && m[1] === today;
    });
    if (match) {
      const rect = match.getBoundingClientRect();
      const scrollX =
        window.scrollX + rect.left - window.innerWidth / 2 + rect.width / 2;
      window.scrollTo({ left: scrollX, behavior: "smooth" });
    }
  } catch (e) {
    // ignore
  }
}

document.addEventListener("DOMContentLoaded", loadImagesFromAssets);
