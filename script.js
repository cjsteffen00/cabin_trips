const scrollContainer = document.querySelector('.scroll-container');

scrollContainer.addEventListener('wheel', (evt) => {
    // Prevent the default vertical scroll behavior
    evt.preventDefault();
    
    // Translate the vertical scroll delta (up/down) into horizontal movement (left/right)
    scrollContainer.scrollLeft += evt.deltaY;
});