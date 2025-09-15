const views = ['login-container', 'loading', 'dashboard'];
const dashboardPages = ['home-page', 'movies-page', 'tv-shows-page', 'genres-page', 'specific-genre-page', 'profile-page', 'search-results-page', 'details-page', 'watchlist-page'];
let contentDataStore = [];
let watchlist = [];
let genresStore = new Set();
let currentMovieId = null;
let lastView = 'home-page';
let currentReviewRating = 0;
let debounceTimer;

let profileData = {
    username: 'Username',
    email: 'user@master.com',
    picUrl: 'https://placehold.co/100x100/f59e0b/000000?text=U'
};

let paginationState = {
    movies: { currentPage: 1, totalResults: 0 },
    tvShows: { currentPage: 1, totalResults: 0 }
};
const ITEMS_PER_PAGE = 20; 


const API_KEY = '888c8dd40f8d6ebb000f1dbba2164b2d';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4ODhjZGRkNDBlNjdiYjNlYmIwMGYxZGJiYTIxNmI2ZCIsInN1YiI6IjY2ZTY0YTcyNzA0NDI5MDE2NDNlYjY4YyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.NDhiYzc1MzIzNGZlZGU5YjI3YjI2YyJhYzJjZmZlM2ZkMjcxY2JjNTM4OGIzYzcyOWM0YjQ4NDdlYmRhMzg';
const API_URL = `https://api.themoviedb.org/3`;
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const PLACEHOLDER_IMG = 'https://placehold.co/400x600/1f2937/a8a29e?text=No+Image';
let genreMap = {};
let reverseGenreMap = {};

function saveWatchlist() {
    localStorage.setItem('movieEWatchlist', JSON.stringify(watchlist));
}

function loadWatchlist() {
    const savedWatchlist = localStorage.getItem('movieEWatchlist');
    if (savedWatchlist) {
        watchlist = JSON.parse(savedWatchlist);
    }
}

function loadProfileData() {
    const savedData = localStorage.getItem('movieEProfile');
    if (savedData) {
        profileData = JSON.parse(savedData);
    }
    const profileImages = document.querySelectorAll('img[alt="User Profile"]');
    profileImages.forEach(img => {
        img.src = profileData.picUrl;
        img.onerror = () => { img.src = 'https://placehold.co/100x100/f59e0b/000000?text=U' };
    });

    document.getElementById('profile-username').textContent = profileData.username;
    document.getElementById('profile-email').textContent = profileData.email;
}

function saveProfileData() {
    localStorage.setItem('movieEProfile', JSON.stringify(profileData));
    loadProfileData();
}

function toggleProfileEdit(isEditing) {
    const viewDiv = document.getElementById('profile-view');
    const editDiv = document.getElementById('profile-edit');

    if (isEditing) {
        document.getElementById('username-input').value = profileData.username;
        document.getElementById('profile-pic-input').value = profileData.picUrl;
        viewDiv.classList.add('hidden');
        editDiv.classList.remove('hidden');
    } else {
        viewDiv.classList.remove('hidden');
        editDiv.classList.add('hidden');
    }
}

function saveProfile() {
    const newUsername = document.getElementById('username-input').value.trim();
    const newPicUrl = document.getElementById('profile-pic-input').value.trim();

    if (newUsername) {
        profileData.username = newUsername;
    }
    if (newPicUrl) {
        profileData.picUrl = newPicUrl;
    }

    saveProfileData();
    toggleProfileEdit(false);
}

async function apiFetch(endpoint) {
    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${API_URL}${endpoint}${separator}api_key=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error("API request failed:", response.status, response.statusText);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching from endpoint ${endpoint}:`, error);
        return null;
    }
}

function showView(viewId, isLogout = false) {
    const loginCard = document.getElementById('login-card');
    const loginContainer = document.getElementById('login-container');
    const loadingDiv = document.getElementById('loading');
    const dashboardDiv = document.getElementById('dashboard');
    const bgAnimation = document.getElementById('background-animation');
    
    const allTopLevelViews = { 'login-container': loginContainer, 'loading': loadingDiv, 'dashboard': dashboardDiv };

    if (isLogout) {
        document.getElementById('app').classList.add('flex', 'items-center', 'justify-center');
        bgAnimation.classList.remove('hidden');
        dashboardDiv.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        loginCard.classList.remove('is-flipped');
        loadingDiv.classList.add('hidden');
        loadingDiv.classList.remove('is-loading');
        return;
    }

    if (viewId === 'user-login' || viewId === 'new-user') {
        document.getElementById('user-login').classList.add('hidden');
        document.getElementById('new-user').classList.add('hidden');
        document.getElementById(viewId).classList.remove('hidden');
        loginCard.classList.add('is-flipped');
        return;
    }
    
    if (viewId === 'role-selection') {
        loginCard.classList.remove('is-flipped');
        return;
    }
    
    if (viewId === 'guest') {
        handleLogin('guest');
        return;
    }

    if (allTopLevelViews[viewId]) {
        Object.values(allTopLevelViews).forEach(view => view.classList.add('hidden'));
        allTopLevelViews[viewId].classList.remove('hidden');
        
        if (viewId === 'loading') {
            allTopLevelViews.loading.classList.add('is-loading');
        } else {
            allTopLevelViews.loading.classList.remove('is-loading');
        }
    }
}

function handleLogin(role) {
    const loadingText = document.getElementById('loading-text');
    
    showView('loading');
    
    switch(role) {
        case 'user':
            loadingText.textContent = 'ACCESSING DATABASE...';
            break;
        case 'new-user':
            loadingText.textContent = 'CREATING PROFILE...';
            break;
        case 'guest':
            loadingText.textContent = 'LOADING GUEST PASS...';
            break;
    }

    const slidePanels = document.querySelectorAll('.slide-panel');
    slidePanels.forEach(panel => {
        panel.style.animation = 'none';
        panel.offsetHeight; 
        panel.style.animation = '';
    });
    loadingText.style.animation = 'none';
    loadingText.offsetHeight;
    loadingText.style.animation = '';
    
    setTimeout(() => {
        showView('dashboard');
        document.getElementById('app').classList.remove('flex', 'items-center', 'justify-center');
        document.getElementById('background-animation').classList.add('hidden');
        showDashboardPage('home-page'); 
    }, 2500);
}

function renderGenreChart() {
    const chartCanvas = document.getElementById('genre-chart');
    if (!chartCanvas) return;
    if (chartCanvas.chart) {
        chartCanvas.chart.destroy();
    }

    const genreCounts = {};
    contentDataStore.forEach(item => {
        if (item.genre && item.genre !== 'N/A') {
            const genres = item.genre.split(', ');
            genres.forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        }
    });

    const sortedGenres = Object.entries(genreCounts).sort(([,a],[,b]) => b-a);
    const topGenres = sortedGenres.slice(0, 6);
    const labels = topGenres.map(item => item[0]);
    const data = topGenres.map(item => item[1]);

    const ctx = chartCanvas.getContext('2d');
    chartCanvas.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Popularity',
                data: data,
                backgroundColor: [
                    'rgba(245, 158, 11, 0.8)', 
                    'rgba(250, 204, 21, 0.8)', 
                    'rgba(79, 70, 229, 0.8)',  
                    'rgba(13, 148, 136, 0.8)', 
                    'rgba(107, 114, 128, 0.8)', 
                    'rgba(14, 165, 233, 0.8)' 
                ],
                borderColor: 'rgba(17, 24, 39, 0.8)', 
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#d1d5db', 
                        font: {
                            size: 14,
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Most Popular Genres',
                    color: '#facc15', 
                    font: {
                        size: 20,
                        family: "'Orbitron', sans-serif",
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 20
                    }
                }
            }
        }
    });
}


async function showDashboardPage(pageId, filter = null, page = 1) {
    if(!['details-page'].includes(pageId)) {
        lastView = pageId;
    }
    dashboardPages.forEach(p => document.getElementById(p).classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');

    if (pageId === 'home-page') {
        const genreContainer = document.getElementById('genre-animation-container');
        if (genreContainer && genreContainer.children.length === 0) {
            populateGenreAnimation();
        }
        renderGenreChart();
    } else if (pageId === 'movies-page') {
        paginationState.movies.currentPage = page;
        const data = await apiFetch(`/movie/popular?language=en-US&page=${page}`);
        if (data && data.results) {
            paginationState.movies.totalResults = data.total_results;
            const movies = data.results.map(formatApiData).filter(Boolean);
            populateGrid('movies-grid', 'movie', null, movies, page, false);
            renderPagination('movies-pagination', 'movies-page', paginationState.movies.totalResults, page);
        }
    } else if (pageId === 'tv-shows-page') {
        paginationState.tvShows.currentPage = page;
        const data = await apiFetch(`/tv/popular?language=en-US&page=${page}`);
        if (data && data.results) {
            paginationState.tvShows.totalResults = data.total_results;
            const tvShows = data.results.map(m => formatApiData({...m, media_type: 'tv'})).filter(Boolean);
            populateGrid('tv-shows-grid', 'series', null, tvShows, page, false);
            renderPagination('tv-shows-pagination', 'tv-shows-page', paginationState.tvShows.totalResults, page);
        }
    } else if (pageId === 'genres-page') {
        populateGenres();
    } else if (pageId === 'watchlist-page') {
        populateWatchlistGrid();
    } else if (pageId === 'specific-genre-page' && filter) {
        document.getElementById('genre-name').textContent = filter;
        const genreId = reverseGenreMap[filter];
        if (genreId) {
            const promises = [];
            for (let i = 1; i <= 5; i++) {
                promises.push(apiFetch(`/discover/movie?with_genres=${genreId}&language=en-US&page=${i}`));
                promises.push(apiFetch(`/discover/tv?with_genres=${genreId}&language=en-US&page=${i}`));
            }
            
            const results = await Promise.all(promises);
            
            let combinedResults = [];
            results.forEach((result, index) => {
                if (result && result.results) {
                    if (index % 2 === 0) { 
                        combinedResults.push(...result.results);
                    } else { 
                        combinedResults.push(...result.results.map(item => ({...item, media_type: 'tv'})));
                    }
                }
            });

            const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());
            
            const formattedResults = uniqueResults.map(formatApiData).filter(Boolean);
            populateGrid('specific-genre-grid', null, null, formattedResults, 1, false);
        } else {
            document.getElementById('specific-genre-grid').innerHTML = '<p class="col-span-full text-center text-gray-400 py-10">Could not find content for this genre.</p>';
        }
    } else if (pageId === 'search-results-page' && filter) {
        document.getElementById('search-term').textContent = filter.term;
        populateGrid('search-results-grid', null, null, filter.results, 1, false);
    }
}

function viewItemDetails(itemId) {
    showDashboardPage('details-page');
    updateFeaturedMovie(itemId);
}

function goBack() {
    showDashboardPage(lastView);
}

async function fetchGenres() {
    const movieGenres = await apiFetch('/genre/movie/list');
    const tvGenres = await apiFetch('/genre/tv/list');
    
    if (movieGenres) movieGenres.genres.forEach(g => genreMap[g.id] = g.name);
    if (tvGenres) tvGenres.genres.forEach(g => genreMap[g.id] = g.name);
    
    for (const id in genreMap) {
        reverseGenreMap[genreMap[id]] = id;
    }
}

function formatApiData(item) {
    if (!item || (!item.title && !item.name) || !item.overview) return null;
    
    const poster = item.poster_path ? `${IMG_URL}${item.poster_path}` : PLACEHOLDER_IMG;
    const backdrop = item.backdrop_path ? `${IMG_URL}${item.backdrop_path}` : poster;
    const itemType = item.media_type || (item.title ? 'movie' : 'tv');

    const genreNames = item.genre_ids ? item.genre_ids.map(id => genreMap[id]).filter(Boolean).join(', ') : 'N/A';
    if (genreNames !== 'N/A') {
        genreNames.split(', ').forEach(g => genresStore.add(g.trim()));
    }

    const formattedItem = {
        id: item.id,
        type: itemType === 'tv' ? 'series' : 'movie',
        genre: genreNames,
        title: item.title || item.name,
        posterImg: poster,
        mainImg: backdrop,
        description: item.overview,
        rating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
        year: item.release_date ? item.release_date.substring(0, 4) : (item.first_air_date ? item.first_air_date.substring(0, 4) : 'N/A'),
        liked: false,
        reviews: [
            { username: '@CinemaFan88', text: 'Absolutely stunning visuals and the story is getting more intense! 10/10', rating: 5, likes: 121, dislikes: 2, userInteraction: null },
            { username: '@AnimeLover23', text: 'The animation quality is top-tier. A must-watch for any shonen fan.', rating: 4, likes: 98, dislikes: 0, userInteraction: null }
        ]
    };
    
    if (!contentDataStore.some(existing => existing.id === formattedItem.id)) {
        contentDataStore.push(formattedItem);
    }

    return formattedItem;
}

async function initializeData() {
    await fetchGenres();

    const [popularMovies, popularTV] = await Promise.all([
        apiFetch('/movie/popular?language=en-US&page=1'),
        apiFetch('/tv/popular?language=en-US&page=1')
    ]);
    
    if (popularMovies && popularMovies.results) {
        popularMovies.results.forEach(formatApiData);
    }
    if(popularTV && popularTV.results) {
        popularTV.results.forEach(m => formatApiData({...m, media_type: 'tv'}));
    }
}

function updateFeaturedMovie(contentId) {
    const movie = contentDataStore.find(m => m.id == contentId); 
    if(movie) {
        currentMovieId = contentId;
        document.getElementById('featured-img').src = movie.mainImg;
        
        const posterImg = document.getElementById('featured-poster-img');
        posterImg.src = movie.posterImg;
        
        posterImg.classList.remove('poster-pop');
        void posterImg.offsetWidth; 
        posterImg.classList.add('poster-pop');

        document.getElementById('featured-title').innerHTML = `"${movie.title}"`;
        document.getElementById('featured-description').innerHTML = `<span class="font-bold text-yellow-400">Rating: ${movie.rating} / 10</span><br>${movie.description}`;
        
        const movieActionsContainer = document.getElementById('movie-actions');
        const isLiked = movie.liked;
        const onWatchlist = watchlist.includes(parseInt(contentId));

        movieActionsContainer.innerHTML = `
            <button onclick="handleLikeMovie('${movie.id}')" class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${isLiked ? 'bg-rose-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
                <span>${isLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button onclick="handleAddToWatchlist('${movie.id}')" class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${onWatchlist ? 'bg-sky-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path></svg>
                <span>${onWatchlist ? 'On Watchlist' : 'Add to Watchlist'}</span>
            </button>
        `;

        document.getElementById('review-movie-title').textContent = movie.title;
        renderReviews(contentId);
        renderStarRatingInput();
    }
}

function populateGrid(gridId, typeFilter, genreFilter = null, customData = null, page = 1, paginate = true) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    let dataToDisplay = customData || contentDataStore;

    if (!customData) {
        if (typeFilter) {
            dataToDisplay = dataToDisplay.filter(item => item && (item.type === typeFilter || (typeFilter === 'series' && item.type === 'tv-show')));
        }
        if (genreFilter) {
            dataToDisplay = dataToDisplay.filter(item => item && item.genre.includes(genreFilter));
        }
    }
    
    const itemsToRender = paginate ? dataToDisplay.slice((page - 1) * ITEMS_PER_PAGE, (page - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE) : dataToDisplay;
    
    if (itemsToRender.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-gray-400 py-10">No content found.</p>`;
        return;
    }

    itemsToRender.forEach(item => {
        if(!item) return;
        const card = `
            <div class="text-center cursor-pointer group" onclick="viewItemDetails('${item.id}')">
                <div class="relative">
                    <img src="${item.posterImg}" alt="${item.title}" class="w-full h-auto object-cover rounded-lg shadow-md group-hover:scale-105 group-hover:shadow-yellow-500/50 transition-all duration-300" onerror="this.src='${PLACEHOLDER_IMG}'">
                    <div class="absolute top-2 right-2 bg-black bg-opacity-75 text-yellow-400 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <span>${item.rating}</span>
                    </div>
                </div>
                <h4 class="mt-2 font-semibold truncate">${item.title}</h4>
                <p class="text-sm text-gray-400">${item.year}</p>
            </div>
        `;
        grid.innerHTML += card;
    });
}

function populateGenres() {
    const grid = document.getElementById('genres-grid');
    grid.innerHTML = '';
    const sortedGenres = Array.from(genresStore).sort();
    sortedGenres.forEach(genre => {
        const button = `
            <button onclick="showDashboardPage('specific-genre-page', '${genre}')" class="bg-gray-800 hover:bg-yellow-600 hover:text-black text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-300">
                ${genre}
            </button>
        `;
        grid.innerHTML += button;
    });
}

function populateGenreAnimation() {
    const container = document.getElementById('genre-animation-container');
    if (!container) return;
    container.innerHTML = '';
    const sortedGenres = Array.from(genresStore).sort();

    sortedGenres.forEach(genre => {
        const genreEl = document.createElement('span');
        genreEl.className = 'floating-genre';
        genreEl.textContent = genre;

        const direction = Math.random() > 0.5 ? 'up' : 'down';
        genreEl.style.animationName = `float-${direction}`;

        genreEl.style.left = `${Math.random() * 90}vw`;
        genreEl.style.fontSize = `${Math.random() * 2 + 1.5}rem`; 
        const duration = Math.random() * 30 + 20;
        genreEl.style.animationDuration = `${duration}s`; 
        genreEl.style.animationDelay = `${Math.random() * -duration}s`; 

        container.appendChild(genreEl);
    });
}

function generateStarsHTML(rating, isInput = false) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        const isFilled = i <= rating;
        const clickHandler = isInput ? `onclick="setStarRating(${i})"` : '';
        starsHTML += `<svg ${clickHandler} class="w-5 h-5 ${isFilled ? '' : 'empty'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
    }
    return `<div class="star-rating-display flex">${starsHTML}</div>`;
}

function renderStarRatingInput() {
    const container = document.getElementById('star-rating-input');
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const starSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        starSVG.setAttribute('class', 'w-6 h-6');
        starSVG.setAttribute('fill', 'currentColor');
        starSVG.setAttribute('viewBox', '0 0 20 20');
        starSVG.innerHTML = `<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>`;
        
        starSVG.addEventListener('click', () => setStarRating(i));
        container.appendChild(starSVG);
    }
    setStarRating(currentReviewRating); 
}

function setStarRating(rating) {
    currentReviewRating = rating;
    const stars = document.querySelectorAll('#star-rating-input svg');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

function renderReviews(movieId) {
    const commentsContainer = document.getElementById('comments-section');
    commentsContainer.innerHTML = '';
    const movie = contentDataStore.find(m => m.id == movieId);

    if (movie && movie.reviews && movie.reviews.length > 0) {
        movie.reviews.forEach((review, index) => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'border-b border-gray-700 pb-4';
            
            let editControls = '';
            if(review.username === '@GuestUser') {
                editControls = `
                <div class="flex items-center space-x-4">
                    <button class="text-sm text-indigo-400 hover:underline" onclick="toggleEditState('${movieId}', ${index}, true)">Edit</button>
                    <button class="text-sm text-rose-500 hover:underline" onclick="handleDeleteReview('${movieId}', ${index})">Delete</button>
                </div>`;
            }
            
            const starsHTML = review.rating ? generateStarsHTML(review.rating) : '';

            const likeButtonClass = review.userInteraction === 'like' ? 'text-yellow-400' : '';
            const dislikeButtonClass = review.userInteraction === 'dislike' ? 'text-yellow-400' : '';

            reviewElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-semibold flex items-center gap-x-3">${review.username} ${starsHTML}</p>
                        <p class="text-gray-400 mt-1">${review.text}</p>
                    </div>
                    ${editControls}
                </div>
                <div class="flex items-center space-x-4 mt-2">
                    <button class="review-interaction-btn flex items-center space-x-1 ${likeButtonClass}" onclick="handleReviewInteraction('${movieId}', ${index}, 'like')">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V19h10V9.333l-4-5.333-4 5.333z"></path></svg>
                        <span>${review.likes}</span>
                    </button>
                    <button class="review-interaction-btn flex items-center space-x-1 ${dislikeButtonClass}" onclick="handleReviewInteraction('${movieId}', ${index}, 'dislike')">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V1H4v10.667l4 5.333 4-5.333z"></path></svg>
                        <span>${review.dislikes}</span>
                    </button>
                </div>
            `;
            commentsContainer.appendChild(reviewElement);
        });
    } else {
        commentsContainer.innerHTML = '<p class="text-gray-500">Be the first to leave a review!</p>';
    }
}

function handleAddReview() {
    const reviewTextarea = document.getElementById('review-textarea');
    const reviewText = reviewTextarea.value.trim();

    if (reviewText && currentMovieId) {
        const movie = contentDataStore.find(m => m.id == currentMovieId);
        if (movie) {
            const newReview = {
                username: '@GuestUser',
                text: reviewText,
                rating: currentReviewRating,
                likes: 0,
                dislikes: 0,
                userInteraction: null
            };
            movie.reviews.unshift(newReview);
            renderReviews(currentMovieId);
            reviewTextarea.value = '';
            setStarRating(0); 
        }
    }
}

function handleReviewInteraction(movieId, reviewIndex, type) {
    const movie = contentDataStore.find(m => m.id == movieId);
    if (movie && movie.reviews[reviewIndex]) {
        const review = movie.reviews[reviewIndex];
        const currentState = review.userInteraction;

        if (type === 'like') {
            if (currentState === 'like') {
                review.likes--;
                review.userInteraction = null;
            } else {
                if (currentState === 'dislike') {
                    review.dislikes--;
                }
                review.likes++;
                review.userInteraction = 'like';
            }
        } else if (type === 'dislike') {
            if (currentState === 'dislike') {
                review.dislikes--;
                review.userInteraction = null;
            } else {
                if (currentState === 'like') {
                    review.likes--;
                }
                review.dislikes++;
                review.userInteraction = 'dislike';
            }
        }
        renderReviews(movieId);
    }
}

function toggleEditState(movieId, reviewIndex, isEditing) {
    const movie = contentDataStore.find(m => m.id == movieId);
    if (!movie || !movie.reviews[reviewIndex]) return;

    const review = movie.reviews[reviewIndex];
    const commentsContainer = document.getElementById('comments-section');
    const reviewElement = commentsContainer.children[reviewIndex];

    if (isEditing) {
        reviewElement.innerHTML = `
            <p class="font-semibold">${review.username}</p>
            <textarea class="w-full mt-1 p-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500">${review.text}</textarea>
            <div class="flex items-center space-x-2 mt-2">
                <button class="text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md" onclick="saveEditedReview('${movieId}', ${reviewIndex})">Save</button>
                <button class="text-sm bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded-md" onclick="renderReviews('${movieId}')">Cancel</button>
            </div>
        `;
    } 
}

function saveEditedReview(movieId, reviewIndex) {
    const movie = contentDataStore.find(m => m.id == movieId);
    const commentsContainer = document.getElementById('comments-section');
    const reviewElement = commentsContainer.children[reviewIndex];
    const newText = reviewElement.querySelector('textarea').value.trim();

    if (movie && newText) {
        movie.reviews[reviewIndex].text = newText;
    }
    renderReviews(movieId); 
}

function handleDeleteReview(movieId, reviewIndex) {
    const movie = contentDataStore.find(m => m.id == movieId);
    if (movie && movie.reviews[reviewIndex]) {
        movie.reviews.splice(reviewIndex, 1);
        renderReviews(movieId);
    }
}

function handleLikeMovie(movieId) {
    const movie = contentDataStore.find(m => m.id == movieId);
    if (movie) {
        movie.liked = !movie.liked;
        updateFeaturedMovie(movieId);
    }
}

function handleAddToWatchlist(movieId) {
    const movieIdNum = parseInt(movieId);
    const index = watchlist.indexOf(movieIdNum);
    if (index > -1) {
        watchlist.splice(index, 1); 
    } else {
        watchlist.push(movieIdNum); 
    }
    saveWatchlist(); 
    updateFeaturedMovie(movieId); 
}

function populateWatchlistGrid() {
    const grid = document.getElementById('watchlist-grid');
    grid.innerHTML = '';
    if (watchlist.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-gray-400 py-10">Your watchlist is empty. Add some movies and shows!</p>`;
        return;
    }
    const watchlistItems = contentDataStore.filter(movie => watchlist.includes(movie.id));
    if (watchlistItems.length === 0 && watchlist.length > 0) {
         grid.innerHTML = `<p class="col-span-full text-center text-gray-400 py-10">Loading your watchlist items... Please wait a moment.</p>`;
    }
    watchlistItems.forEach(item => {
        if(!item) return;
        const card = `
            <div class="text-center cursor-pointer group" onclick="viewItemDetails('${item.id}')">
                <img src="${item.posterImg}" alt="${item.title}" class="w-full h-auto object-cover rounded-lg shadow-md group-hover:scale-105 group-hover:shadow-yellow-500/50 transition-all duration-300" onerror="this.src='${PLACEHOLDER_IMG}'">
                <h4 class="mt-2 font-semibold truncate">${item.title}</h4>
            </div>
        `;
        grid.innerHTML += card;
    });
}

function renderSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('search-suggestions');
    suggestionsContainer.innerHTML = '';
    if (suggestions.length === 0) {
        suggestionsContainer.classList.add('hidden');
        return;
    }

    suggestions.forEach(item => {
        if (!item) return;
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'flex items-center p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0';
        suggestionEl.onclick = () => {
            formatApiData(item);
            viewItemDetails(item.id);
            hideSuggestions();
        };

        const posterSrc = item.poster_path ? `${IMG_URL}${item.poster_path}` : PLACEHOLDER_IMG;
        const year = item.release_date ? item.release_date.substring(0, 4) : (item.first_air_date ? item.first_air_date.substring(0, 4) : 'N/A');

        suggestionEl.innerHTML = `
            <img src="${posterSrc}" class="w-10 h-14 object-cover rounded mr-4" onerror="this.src='${PLACEHOLDER_IMG}'">
            <div>
                <p class="font-semibold">${item.title || item.name}</p>
                <p class="text-sm text-gray-400">${year}</p>
            </div>
        `;
        suggestionsContainer.appendChild(suggestionEl);
    });

    suggestionsContainer.classList.remove('hidden');
}

function hideSuggestions() {
    const suggestionsContainer = document.getElementById('search-suggestions');
    suggestionsContainer.classList.add('hidden');
    suggestionsContainer.innerHTML = '';
}

async function handleSearchInput(event) {
    const searchTerm = event.target.value.trim();
    if (searchTerm.length < 3) {
        hideSuggestions();
        return;
    }

    const data = await apiFetch(`/search/multi?query=${encodeURIComponent(searchTerm)}&include_adult=false&language=en-US&page=1`);
    if (data && data.results) {
        const results = data.results
            .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
            .slice(0, 6); 
        renderSuggestions(results);
    } else {
        hideSuggestions();
    }
}

function debounce(func, delay = 300) {
    return (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

async function performSearch() {
    hideSuggestions();
    const searchTerm = document.getElementById('search-input').value.trim();
    if (searchTerm) {
        const data = await apiFetch(`/search/multi?query=${encodeURIComponent(searchTerm)}&include_adult=false&language=en-US&page=1`);
        
        if (data && data.results) {
            const searchResults = data.results
                .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
                .map(formatApiData)
                .filter(Boolean);
            
            showDashboardPage('search-results-page', { term: searchTerm, results: searchResults });
        } else {
        document.getElementById('search-results-grid').innerHTML = `<p class="col-span-full text-center text-gray-400">No results found for "${searchTerm}".</p>`;
                         showDashboardPage('search-results-page', { term: searchTerm, results: [] });
        }
    }
}

async function handleSearch(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
}

function renderPagination(containerId, pageId, totalItems, currentPage) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalPages <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo;';
    prevButton.className = 'bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => showDashboardPage(pageId, null, currentPage - 1);
    container.appendChild(prevButton);

    const pagesToShow = new Set([1, currentPage, totalPages]);
    if (currentPage > 2) pagesToShow.add(currentPage - 1);
    if (currentPage < totalPages - 1) pagesToShow.add(currentPage + 1);

    const sortedPages = Array.from(pagesToShow).sort((a,b) => a-b);
    
    let lastPage = 0;
    for (const i of sortedPages) {
        if (window.innerWidth < 480 && sortedPages.length > 4 && i !== 1 && i !== currentPage && i !== totalPages) {
            continue;
        }

        if (lastPage > 0 && i > lastPage + 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 py-2';
            container.appendChild(dots);
        }

        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg';
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.onclick = () => showDashboardPage(pageId, null, i);
        container.appendChild(pageButton);
        lastPage = i;
    }

    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;';
    nextButton.className = 'bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => showDashboardPage(pageId, null, currentPage + 1);
    container.appendChild(nextButton);
}

document.addEventListener('DOMContentLoaded', async () => {
    loadWatchlist(); 
    loadProfileData();
    await initializeData(); 
    document.getElementById('search-input').addEventListener('input', debounce(handleSearchInput));
    document.getElementById('search-input').addEventListener('keydown', handleSearch);
    document.getElementById('search-button').addEventListener('click', performSearch);
    document.getElementById('submit-review-button').addEventListener('click', handleAddReview);
    document.getElementById('mobile-menu-button').addEventListener('click', toggleMobileMenu);

    document.addEventListener('click', (event) => {
        const searchContainer = document.getElementById('search-container');
        if (!searchContainer.contains(event.target)) {
            hideSuggestions();
        }
    });
    
    views.forEach(v => document.getElementById(v).classList.add('hidden'));
    document.getElementById('login-container').classList.remove('hidden');
});