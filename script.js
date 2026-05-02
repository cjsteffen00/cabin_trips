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

    // --- 4. FIREBASE CALENDAR SYNC ---
    
    // 1. PASTE YOUR CONFIG HERE (Copy this from Step 3!)
    const firebaseConfig = {
        apiKey: "AIzaSyCBebz5BVt667do3dnJEsqcc9a7JJeA6eI",
        authDomain: "itinerary-a32b4.firebaseapp.com",
        projectId: "itinerary-a32b4",
        storageBucket: "itinerary-a32b4.firebasestorage.app",
        messagingSenderId: "607888607739",
        appId: "1:607888607739:web:75db61131ebd14b06f235e"
    };

    // 2. Initialize Firebase and the Database
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const calDays = document.querySelectorAll('.cal-content');

    calDays.forEach(day => {
        // Create a reference to a specific document for this day (e.g., 'day-1')
        const docRef = db.collection('cabin_calendar').doc(day.id);

        // 3. LISTEN: Automatically pull data and listen for live updates from others
        docRef.onSnapshot((doc) => {
            if (doc.exists) {
                // crucial check: Only update the box if YOU aren't currently typing in it!
                // This prevents your cursor from jumping if someone else updates the database.
                if (document.activeElement !== day) {
                    day.innerHTML = doc.data().text;
                }
            }
        });

        // 4. WRITE: Save the text to the cloud when they click away from the box
        day.addEventListener('blur', function() {
            docRef.set({
                text: this.innerHTML
            }, { merge: true }); 
        });
    });

    // --- 5. FIREBASE DYNAMIC CARPOOL LOGIC ---
    const carpoolContainer = document.getElementById('carpool-container');
    const carCountSelect = document.getElementById('car-count');

    if (carpoolContainer && carCountSelect) {
        
        // We use an array to track our live database listeners so we can clean them 
        // up if someone changes the number of cars. (Prevents memory leaks!)
        let fieldListeners = []; 

        // 1. SYNC THE DROPDOWN: Listen to the database for the global car count
        const settingsRef = db.collection('cabin_settings').doc('carpool_config');
        
        settingsRef.onSnapshot((doc) => {
            let count = 2; // Default to 2 cars if the database is empty
            if (doc.exists && doc.data().carCount) {
                count = doc.data().carCount;
            }

            // THE FIX: Physically count how many cars are currently drawn on the screen!
            const currentlyRenderedCars = carpoolContainer.querySelectorAll('.car-card').length;

            // If the screen doesn't match the database, rebuild the grid and update the dropdown.
            if (currentlyRenderedCars != count) {
                carCountSelect.value = count;
                renderCars(count);
            }
        });

        // When YOU change the dropdown, tell the database
        carCountSelect.addEventListener('change', (e) => {
            settingsRef.set({ carCount: e.target.value }, { merge: true });
        });


        // 2. BUILD THE CARS & SYNC THE TEXT
        function renderCars(count) {
            // Clean up old database listeners before wiping the grid
            fieldListeners.forEach(unsubscribe => unsubscribe());
            fieldListeners = [];

            // Clear the grid
            carpoolContainer.innerHTML = '';
            
            // Build the HTML cards
            for (let i = 1; i <= count; i++) {
                const carCard = document.createElement('div');
                carCard.className = 'car-card';
                
                carCard.innerHTML = `
                    <div class="car-header editable-field" id="car-${i}-title" data-placeholder="Vehicle ${i} Driver" contenteditable="true"></div>
                    <div class="car-body">
                        <div>
                            <div class="field-label">Passengers</div>
                            <div class="editable-field" id="car-${i}-pass" data-placeholder="Add passengers..." contenteditable="true"></div>
                        </div>
                    </div>
                `;
                carpoolContainer.appendChild(carCard);
            }

            // Attach Firebase to the newly created text boxes
            const editableFields = carpoolContainer.querySelectorAll('.editable-field');
            editableFields.forEach(field => {
                const docRef = db.collection('cabin_carpool').doc(field.id);

                // Listen for changes from other people
                const unsubscribe = docRef.onSnapshot((doc) => {
                    if (doc.exists && document.activeElement !== field) {
                        field.innerHTML = doc.data().text || "";
                    }
                });
                // Save the listener so we can turn it off later if needed
                fieldListeners.push(unsubscribe);

                // Save to Firebase when you click away from the box
                field.addEventListener('blur', function() {
                    docRef.set({
                        text: this.innerHTML
                    }, { merge: true });
                });
            });
        }
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

    // --- 7. DYNAMIC COLLAGE GALLERY (MIXED MEDIA RETURNING) ---
    const container = document.getElementById('collage-container');
    
    if (container) {
        // 1. Set your totals
        const totalPhotos = 268; 
        const totalVideos = 50;
        
        const mediaPaths = [];
        
        // 2. Build the Master Pool from both folders
        // Grab all the photos (using your _X_.jpg format)
        for (let i = 1; i <= totalPhotos; i++) {
            mediaPaths.push(`imgs/photos/_${i}_.jpg`);
        }
        
        // Grab all the videos
        for (let i = 1; i <= totalVideos; i++) {
            mediaPaths.push(`imgs/videos/${i}_.mov`);
        }

        const numCols = 4;
        const numRows = 3;
        const totalCells = numCols * numRows;
        const cells = [];
        let displayedMedia = [];

        // Shuffle Function (Keeps the grid completely random on refresh)
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

        // 3. Smart Element Creator (Builds an <img> for photos, <video> for movies)
        function createMediaElement(src) {
            let el;
            if (src.includes('.mov') || src.includes('.mp4')) {
                el = document.createElement('video');
                el.src = src;
                el.autoplay = true;
                el.muted = true; // Required for browsers to allow autoplay
                el.loop = true;
                el.playsInline = true;
            } else {
                el = document.createElement('img');
                el.src = src;
            }
            return el;
        }

        // 4. Build Initial Grid
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

        // 5. Double Swap Animation
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