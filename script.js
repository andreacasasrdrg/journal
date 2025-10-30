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
      const minSize = 120,
        maxSize = 320;
      const scale = getRandomBetween(minSize, maxSize) / originalWidth;
      return {
        width: originalWidth * scale,
        height: originalHeight * scale,
      };
    }

    function findBestPosition(width, height) {
      const gridSize = 10;
      for (let y = 0; y < window.innerHeight * 3; y += gridSize * 3) {
        for (let x = 0; x + width <= window.innerWidth; x += gridSize) {
          const verticalVariation = getRandomBetween(-30, 50);
          const posY = Math.max(0, y + verticalVariation);
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
      // Fallback: random position
      const randomX = getRandomBetween(
        0,
        Math.max(0, window.innerWidth - width)
      );
      const randomY = getRandomBetween(
        0,
        Math.max(0, window.innerHeight * 3 - height)
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
      img.style.width = width + "px";
      img.style.height = height + "px";
      const position = findBestPosition(width, height);
      img.style.left = position.x + "px";
      img.style.top = position.y + "px";
      const requiredHeight = position.y + height + 100;
      const currentHeight =
        parseInt(gallery.style.height) || window.innerHeight;
      if (requiredHeight > currentHeight) {
        gallery.style.height = requiredHeight + "px";
      }
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
    // Use the JSON manifest for infinite scroll and other flows
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

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Only add more images if user has scrolled close to the bottom AND there's space
    if (scrollTop + windowHeight >= documentHeight - 100) {
      isLoading = true;

      console.log(`🔄 Adding more images to fill empty space...`);

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
document.addEventListener("DOMContentLoaded", loadImagesFromAssets);
