gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

document.addEventListener('DOMContentLoaded', () => {

    // PREVENT SCROLL JUMPING ON RELOAD
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // --- 1. HORIZONTAL SCROLL & NAV TIMELINE ---
    const track = document.querySelector('.horizontal-track');
    const panels = gsap.utils.toArray('.panel');
    const moveAmount = 100 / panels.length;

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".pin-master",
            start: "top top",
            end: "+=15000",
            pin: true,
            scrub: 2.5,
            onUpdate: (self) => {
                let scrollTime = self.progress * tl.duration();
                let activeLabel = "home";

                const sortedLabels = Object.keys(tl.labels).map(key => {
                    return { name: key, time: tl.labels[key] };
                }).sort((a, b) => a.time - b.time);

                for (let i = 0; i < sortedLabels.length; i++) {
                    if (scrollTime >= sortedLabels[i].time - 0.1) {
                        activeLabel = sortedLabels[i].name;
                    }
                }

                // Hide Nav Bar on Gallery
                const navBar = document.querySelector('.top-nav');
                if (navBar) {
                    if (activeLabel === "gallery") {
                        navBar.classList.add('nav-hidden');
                    } else {
                        navBar.classList.remove('nav-hidden');
                    }
                }

                // Update Active Links
                document.querySelectorAll('.nav-links a, .nav-brand').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${activeLabel}`) {
                        link.classList.add('active');
                    }
                });
            }
        }
    });

    const pauseTime = 1.5;
    const slideTime = 1;

    tl.addLabel("home")
      .to({}, { duration: pauseTime })
      .to(track, { xPercent: -moveAmount * 1, ease: "power2.inOut", duration: slideTime })
      .addLabel("calendar")
      .to({}, { duration: pauseTime })
      .to(track, { xPercent: -moveAmount * 2, ease: "power2.inOut", duration: slideTime })
      .addLabel("food")
      .to({}, { duration: pauseTime })
      .to(track, { xPercent: -moveAmount * 3, ease: "power2.inOut", duration: slideTime })
      .addLabel("carpool")
      .to({}, { duration: pauseTime })
      .to(track, { xPercent: -moveAmount * 4, ease: "power2.inOut", duration: slideTime })
      .addLabel("info")
      .to({}, { duration: pauseTime })
      .to(track, { xPercent: -moveAmount * 5, ease: "power2.inOut", duration: slideTime })
      .addLabel("gallery")
      .to({}, { duration: pauseTime });

    // --- 2. NAV LINK CLICK ANIMATION ---
    document.querySelectorAll('.nav-links a, .nav-brand').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetLabel = this.getAttribute('href').substring(1);
            gsap.to(window, {
                scrollTo: tl.scrollTrigger.labelToScroll(targetLabel),
                duration: 2,
                ease: "power2.inOut"
            });
        });
    });

    // --- 3. GOOGLE SHEETS DYNAMIC INJECTION ---
    const foodPanel = document.querySelector('#food');
    const menuSheet = document.querySelector('#menu-sheet');
    
    if (foodPanel && menuSheet) {
        const sheetObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    menuSheet.src = menuSheet.getAttribute('data-src');
                    sheetObserver.unobserve(foodPanel);
                }
            });
        }, { threshold: 0.1 });
        sheetObserver.observe(foodPanel);
    }

    // --- 4. CALENDAR LOCAL STORAGE ---
    const calDays = document.querySelectorAll('.cal-content');
    calDays.forEach(day => {
        const savedData = localStorage.getItem(day.id);
        if (savedData) {
            day.innerHTML = savedData;
        }
        day.addEventListener('input', function() {
            localStorage.setItem(this.id, this.innerHTML);
        });
    });

    // --- 5. DYNAMIC CARPOOL LOGIC ---
    const carpoolContainer = document.getElementById('carpool-container');
    const carCountSelect = document.getElementById('car-count');

    if (carpoolContainer && carCountSelect) {
        const savedCarCount = localStorage.getItem('carCount') || 2;
        carCountSelect.value = savedCarCount;

        function renderCars(count) {
            carpoolContainer.innerHTML = '';
            
            for (let i = 1; i <= count; i++) {
                const carCard = document.createElement('div');
                carCard.className = 'car-card';
                
                carCard.innerHTML = `
                    <div class="car-header editable-field" id="car-${i}-title" data-placeholder="Car ${i} Driver" contenteditable="true"></div>
                    <div class="car-body">
                        <div>
                            <div class="field-label">Passengers</div>
                            <div class="editable-field" id="car-${i}-pass" data-placeholder="Add passengers..." contenteditable="true"></div>
                        </div>
                    </div>
                `;
                carpoolContainer.appendChild(carCard);
            }

            const editableFields = carpoolContainer.querySelectorAll('.editable-field');
            editableFields.forEach(field => {
                const savedData = localStorage.getItem(field.id);
                if (savedData) {
                    field.innerHTML = savedData;
                }
                field.addEventListener('input', function() {
                    localStorage.setItem(this.id, this.innerHTML);
                });
            });
        }

        renderCars(carCountSelect.value);

        carCountSelect.addEventListener('change', (e) => {
            const newCount = e.target.value;
            localStorage.setItem('carCount', newCount);
            renderCars(newCount);
        });
    }

    // --- 6. BACKGROUND MUSIC & SPLASH SCREEN LOGIC ---
    const splashScreen = document.getElementById('splash-screen');
    const enterBtn = document.getElementById('enter-btn');
    const musicBtn = document.getElementById('music-toggle');
    const bgMusic = document.getElementById('bg-music');
    let isPlaying = false;

    if (enterBtn && splashScreen && bgMusic) {
        // 1. The Splash Screen Click (Unlocks the Audio!)
        enterBtn.addEventListener('click', () => {
            // Fade out the splash screen
            splashScreen.classList.add('splash-hidden');
            
            // Start the music immediately
            bgMusic.play();
            isPlaying = true;
            
            // Update the floating toggle button text
            if (musicBtn) musicBtn.innerHTML = "Pause";
        });
    }

    // 2. The Floating Toggle Button (For pausing later)
    if (musicBtn && bgMusic) {
        musicBtn.addEventListener('click', () => {
            if (isPlaying) {
                bgMusic.pause();
                musicBtn.innerHTML = "Play";
            } else {
                bgMusic.play();
                musicBtn.innerHTML = "Pause";
            }
            isPlaying = !isPlaying;
        });
    }

    // --- 7. DYNAMIC COLLAGE GALLERY (MIXED MEDIA & SHUFFLE) ---
    const container = document.getElementById('collage-container');
    
    if (container) {
        const totalPhotos = 268; // Update this based on your photos folder
        const totalVideos = 50;  // Update this based on your videos folder
        
        const mediaPaths = [];
        
        // Loop through the photos folder
        for (let i = 1; i <= totalPhotos; i++) {
            mediaPaths.push(`imgs/photos/${i}_.jpg`);
        }
        
        // Loop through the videos folder
        for (let i = 1; i <= totalVideos; i++) {
            mediaPaths.push(`imgs/videos/${i}_.mov`);
        }

        const numCols = 4;
        const numRows = 3;
        const totalCells = numCols * numRows;
        const cells = [];
        let displayedMedia = [];

        // Shuffle Function
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        shuffleArray(mediaPaths);

        function getRandomNewMedia() {
            const available = mediaPaths.filter(media => !displayedMedia.includes(media));
            if (available.length === 0) {
                return mediaPaths[Math.floor(Math.random() * mediaPaths.length)];
            }
            return available[Math.floor(Math.random() * available.length)];
        }

        function createMediaElement(src) {
            let el;
            if (src.includes('.mov') || src.includes('.mp4')) {
                el = document.createElement('video');
                el.src = src;
                el.autoplay = true;
                el.muted = true; 
                el.loop = true;
                el.playsInline = true;
            } else {
                el = document.createElement('img');
                el.src = src;
                
                el.onerror = function() {
                    if (this.src.endsWith('.jpg')) {
                        this.src = this.src.replace('.jpg', '.jpeg');
                    }
                };
            }
            return el;
        }

        // Build Initial Grid
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'collage-cell';
            
            const src = mediaPaths[i % mediaPaths.length]; 
            const mediaEl = createMediaElement(src);
            
            displayedMedia.push(src);
            cell.appendChild(mediaEl);
            container.appendChild(cell);
            
            cells.push({ el: cell, mediaEl: mediaEl });
        }

        // Double Swap Animation
        let collageInterval;
        const galleryObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    collageInterval = setInterval(() => {
                        
                        let index1 = Math.floor(Math.random() * cells.length);
                        let index2;
                        do {
                            index2 = Math.floor(Math.random() * cells.length);
                        } while (index2 === index1);

                        function performSwap(cellIndex) {
                            const targetCell = cells[cellIndex];
                            const newSrc = getRandomNewMedia();
                            
                            const newMediaEl = createMediaElement(newSrc);
                            newMediaEl.style.opacity = 0;
                            targetCell.el.appendChild(newMediaEl);
                            
                            displayedMedia[cellIndex] = newSrc;

                            gsap.to(newMediaEl, {
                                opacity: 1,
                                duration: 1.5,
                                ease: "power2.inOut",
                                onComplete: () => {
                                    targetCell.el.removeChild(targetCell.mediaEl);
                                    targetCell.mediaEl = newMediaEl;
                                }
                            });
                        }

                        performSwap(index1);
                        performSwap(index2);

                    }, 2500); 
                } else {
                    clearInterval(collageInterval);
                }
            });
        }, { threshold: 0.2 });

        galleryObserver.observe(document.getElementById('gallery'));
    }

});