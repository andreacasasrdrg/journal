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
    imageList.forEach((filename, index) => {
      const img = document.createElement("img");
      img.src = `assets/${filename}`;
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
        imagesLoaded++;
        // After all images are loaded, scroll to today's date
        if (imagesLoaded === imageList.length) {
          scrollToTodaysDate();
        }
      };
      gallery.appendChild(img);
    });
    // Scroll to today's date function
    function scrollToTodaysDate() {
      const today = new Date().toISOString().split("T")[0];
      // Find first image that matches today's date
      const todayImage = allImages.find((img) => {
        const filename = img.alt.split(": ")[1];
        const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
        return dateMatch && dateMatch[1] === today;
      });
      if (todayImage) {
        window.scrollTo({
          top: todayImage.offsetTop - window.innerHeight / 2,
          behavior: "smooth",
        });
      }
    }
    console.log("🔗 Found links:", links.length);

    // Filter for image files (common image extensions)
    const imageExtensions = [".gif", ".webp"];
    const imageFiles = [];

    links.forEach((link) => {
      const href = link.getAttribute("href");
      console.log("🔍 Checking link:", href);
      if (href && href !== "../") {
        const hasImageExtension = imageExtensions.some((ext) =>
          href.toLowerCase().endsWith(ext)
        );
        if (hasImageExtension) {
          imageFiles.push(href);
          console.log("✅ Added image:", href);
        }
      }
    });

    console.log("🖼️ Total images found:", imageFiles.length, imageFiles);

    // Sort images by date (YYYY-MM-DD format)
    imageFiles.sort((a, b) => {
      // Extract date from filename using regex
      const dateA = a.match(/(\d{4}-\d{2}-\d{2})/);
      const dateB = b.match(/(\d{4}-\d{2}-\d{2})/);

      if (dateA && dateB) {
        // Compare dates (string comparison works for YYYY-MM-DD format)
        return dateA[1].localeCompare(dateB[1]);
      }

      // If no date found, sort alphabetically as fallback
      return a.localeCompare(b);
    });

    console.log("📅 Images sorted by date:", imageFiles);

    // Get the container element
    // gallery already declared above
    // const gallery = document.getElementById("image-gallery");

    if (imageFiles.length === 0) {
      gallery.innerHTML = "<p>No images found in assets folder</p>";
      return;
    }

    // Set up the gallery for infinite scroll
    gallery.style.position = "relative";
    gallery.style.width = "100vw";
    gallery.style.minHeight = "100vh";

    // Set background color
    document.body.style.backgroundColor = "#2735F2";

    // Initialize global variables
    sectionHeight = window.innerHeight;
    occupiedAreas = [];
    allImages = [];

    // Local variables for infinite scroll
    let currentSection = 0;
    let sectionsGenerated = 0;
    let imagePool = [...imageFiles]; // Copy of images to cycle through

    // Track loaded images for auto-scroll to today's date
    let imagesLoaded = 0;
    let totalImages = imageFiles.length;

    // Function to check if a position overlaps with existing images
    function isPositionOccupied(x, y, width, height, sectionNumber) {
      const sectionTop = sectionNumber * sectionHeight;
      const rect1 = {
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
      };

      return occupiedAreas.some((rect2) => {
        // Check if rectangles overlap
        return !(
          rect1.right <= rect2.left ||
          rect1.left >= rect2.right ||
          rect1.bottom <= rect2.top ||
          rect1.top >= rect2.bottom
        );
      });
    }

    // Function to find the best position that fills gaps
    function findBestPosition(width, height, sectionNumber) {
      const gridSize = 10; // 10px spacing between images

      // Start from the beginning of content, not limited by sections
      let startY = 0;

      // Find the lowest occupied position to start scanning from
      if (occupiedAreas.length > 0) {
        const lowestPoint = Math.max(
          ...occupiedAreas.map((rect) => rect.bottom)
        );
        startY = Math.max(0, lowestPoint - height); // Start a bit higher to fill gaps
      }

      // Try to place with vertical randomness to avoid straight lines
      for (
        let baseY = startY;
        baseY < startY + window.innerHeight * 3;
        baseY += gridSize * 3
      ) {
        for (let x = 0; x + width <= window.innerWidth; x += gridSize) {
          // Add vertical randomness to break up horizontal lines
          const verticalVariation = getRandomBetween(-30, 50); // Random offset -30 to +50px
          const y = Math.max(0, baseY + verticalVariation);

          if (!isPositionOccupied(x, y, width, height, sectionNumber)) {
            // Mark this area as occupied
            occupiedAreas.push({
              left: x,
              top: y,
              right: x + width,
              bottom: y + height,
            });
            return { x, y };
          }
        }
      }

      // If no perfect spot found, find the highest available position
      let bestY = sectionBottom - height;
      for (let x = 0; x + width <= window.innerWidth; x += gridSize) {
        if (!isPositionOccupied(x, bestY, width, height, sectionNumber)) {
          occupiedAreas.push({
            left: x,
            top: bestY,
            right: x + width,
            bottom: bestY + height,
          });
          return { x, y: bestY };
        }
      }

      // Last resort: random position with some overlap allowed
      const randomX = getRandomBetween(
        0,
        Math.max(0, window.innerWidth - width)
      );
      const randomY = getRandomBetween(
        sectionTop,
        Math.max(sectionTop, sectionBottom - height)
      );

      occupiedAreas.push({
        left: randomX,
        top: randomY,
        right: randomX + width,
        bottom: randomY + height,
      });

      return { x: randomX, y: randomY };
    }

    // Function to reposition a single image
    function repositionImage(img, sectionNumber) {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;

      // Calculate random size maintaining aspect ratio
      const { width, height } = getRandomSizeWithAspectRatio(
        originalWidth,
        originalHeight
      );

      // Apply the calculated dimensions
      img.style.width = width + "px";
      img.style.height = height + "px";

      // Find best position to fill gaps
      const position = findBestPosition(width, height, sectionNumber);

      // Apply position
      img.style.left = position.x + "px";
      img.style.top = position.y + "px";

      // Update gallery height to accommodate this image
      const gallery = document.getElementById("image-gallery");
      const requiredHeight = position.y + height + 100; // Add some bottom padding
      const currentHeight =
        parseInt(gallery.style.height) || window.innerHeight;
      if (requiredHeight > currentHeight) {
        gallery.style.height = requiredHeight + "px";
      }
    }

    // Function to recalculate all image positions (responsive)
    function repositionAllImages() {
      console.log("🔄 Recalculating layout for responsive design...");

      // Clear occupied areas
      occupiedAreas = [];

      // Group images by section
      const imagesBySection = {};

      allImages.forEach((img) => {
        const currentTop = parseInt(img.style.top) || 0;
        const sectionNumber = Math.floor(currentTop / sectionHeight);

        if (!imagesBySection[sectionNumber]) {
          imagesBySection[sectionNumber] = [];
        }
        imagesBySection[sectionNumber].push(img);
      });

      // Reposition images section by section
      Object.keys(imagesBySection).forEach((sectionNumber) => {
        const sectionImages = imagesBySection[sectionNumber];
        sectionImages.forEach((img) => {
          repositionImage(img, parseInt(sectionNumber));
        });
      });

      console.log(`✅ Repositioned ${allImages.length} images responsively`);
    }

    // Add resize listener for responsive behavior
    // resizeTimeout already declared above
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        repositionAllImages();
      }, 250); // Debounce resize events
    });

    // Create initial images for the first viewport only
    imageFiles.forEach((filename, index) => {
      const img = document.createElement("img");
      img.src = filename;
      img.alt = `Image ${index + 1}: ${filename}`;
      img.loading = "lazy";

      // Set initial styles for absolute positioning
      img.style.position = "absolute";
      img.style.objectFit = "cover";
      img.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";

      // Set z-index for layering
      img.style.zIndex = index + 1;

      // Add error handling
      img.onerror = function () {
        console.error(`❌ Failed to load image: ${filename}`);
        this.style.display = "none";
      };

      img.onload = function () {
        console.log(`✅ Successfully loaded: ${filename}`);

        // Store original dimensions for responsive recalculation
        this.naturalWidth = this.naturalWidth;
        this.naturalHeight = this.naturalHeight;

        // Calculate and apply initial sizing and positioning
        repositionImage(this, 0);

        // Add to global images array for responsive updates
        allImages.push(this);

        console.log(`🎯 Added image to responsive layout: ${filename}`);

        // Track loaded images and scroll to today's date when all are loaded
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
          scrollToTodaysDate();
        }
      };

      gallery.appendChild(img);
    });

    console.log(`🎉 Loaded ${imageFiles.length} images dynamically`);

    // Function to scroll to today's date
    function scrollToTodaysDate() {
      const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD format
      console.log(`📅 Looking for images from today: ${today}`);

      // Find first image that matches today's date
      const todayImages = allImages.filter((img) => {
        const filename = img.alt.split(": ")[1]; // Extract filename from alt text
        const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
        return dateMatch && dateMatch[1] === today;
      });

      if (todayImages.length > 0) {
        const firstTodayImage = todayImages[0];
        const imageTop = parseInt(firstTodayImage.style.top);

        // Scroll to the image with some offset for better visibility
        const scrollTarget = Math.max(0, imageTop - 100);

        console.log(
          `🎯 Scrolling to today's first image at position ${imageTop}px`
        );

        // Smooth scroll to the target position
        window.scrollTo({
          top: scrollTarget,
          behavior: "smooth",
        });
      } else {
        console.log(`📅 No images found for today (${today})`);
      }
    }

    // Set up natural infinite scroll - only add more images if needed
    setupNaturalInfiniteScroll(imageFiles);
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
