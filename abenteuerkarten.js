const images = [
    { src: "assets/img_karten/holzi-matze85s.png", title: "Holzi - Matze85" },
    { src: "assets/img/img2.png", title: "Gilden-Insel Übersicht" },
    { src: "assets/img/img3.png", title: "Abenteuer: Nordmänner" },
    
];

let currentIndex = 0;
const gallery = document.getElementById('gallery');
const overlay = document.getElementById('overlay');
const largeImage = document.getElementById('largeImage');
const counter = document.getElementById('imageCounter'); 


images.forEach((item, index) => {
    
    const card = document.createElement('div');
    card.className = 'gallery-card';

    
    const title = document.createElement('p');
    title.className = 'gallery-title';
    title.innerText = item.title; 

    const img = document.createElement('img');
    img.src = item.src; 
    img.className = 'thumbnail';
    img.onclick = () => openOverlay(index);

    
    card.appendChild(title);
    card.appendChild(img);

    
    gallery.appendChild(card);
});


images.forEach((src, index) => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'thumbnail';
    img.onclick = () => openOverlay(index);
    gallery.appendChild(img);
});


function updateLargeImage() {
    largeImage.src = images[currentIndex].src; 
    counter.innerText = `${currentIndex + 1} / ${images.length}`;
    
    
    document.getElementById('imageTitle').innerText = images[currentIndex].title;

    
largeImage.style.cursor = "zoom-in";
largeImage.onclick = () => window.open(images[currentIndex].src, '_blank');
}

function openOverlay(index) {
    currentIndex = index;
    updateLargeImage(); 
    overlay.classList.remove('hidden');
}

function closeOverlay() {
    overlay.classList.add('hidden');
}


function nextImage(event) {
    if (event) event.stopPropagation(); 
    currentIndex = (currentIndex + 1) % images.length;
    updateLargeImage();
}

function prevImage(event) {
    if (event) event.stopPropagation();
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateLargeImage();
}


document.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('hidden')) return; 
    if (e.key === 'Escape') closeOverlay();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
});