// Keep your existing navigation code at the top
console.log('IT\'S ALIVE!');
const ARE_WE_HOME = document.documentElement.classList.contains('home');
let pages = [
    { url: '', title: 'Home' },
    { url: './projects/', title: 'Projects' },
    { url: './contacts/', title: 'Contacts' },
    { url: './cv/', title: 'Resume' }
];

pages = pages.map(page => ({
    ...page,
    url: !ARE_WE_HOME && !page.url.startsWith('http') ? '../' + page.url : page.url
}));

let nav = document.createElement('nav');
document.body.prepend(nav);
for (let page of pages) {
    let a = document.createElement('a');
    a.href = page.url;
    a.textContent = page.title;
    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname
    );
    a.toggleAttribute(
        'target',
        a.host !== location.host
    );
    if (a.hasAttribute('target')) {
        a.target = '_blank';
    }
    nav.append(a);
}

// Keep your theme switcher code
document.body.insertAdjacentHTML(
    'afterbegin',
    `<label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`
);

const select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    if (colorScheme === 'light') {
        document.documentElement.style.setProperty('--color-accent', '#3498db');
        document.documentElement.style.setProperty('--color-text', '#2c3e50');
        document.documentElement.style.setProperty('--color-background', '#f8fbfd');
        document.documentElement.style.setProperty('--nav-border-color', '#bbd6e8');
    } else if (colorScheme === 'dark') {
        document.documentElement.style.setProperty('--color-accent', '#5dade2');
        document.documentElement.style.setProperty('--color-text', '#ecf0f1');
        document.documentElement.style.setProperty('--color-background', '#1a1a1a');
        document.documentElement.style.setProperty('--nav-border-color', '#34495e');
    } else {
        document.documentElement.style.removeProperty('--color-accent');
        document.documentElement.style.removeProperty('--color-text');
        document.documentElement.style.removeProperty('--color-background');
        document.documentElement.style.removeProperty('--nav-border-color');
    }
    select.value = colorScheme;
    localStorage.colorScheme = colorScheme;
}

if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', (event) => {
    setColorScheme(event.target.value);
});

// Add these new export functions at the end of your global.js
export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
        throw error;
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!containerElement || !Array.isArray(projects)) return;
    
    // Clear existing content
    containerElement.innerHTML = '';
    
    // Update project count if element exists
    const titleElement = document.querySelector('.projects-title');
    if (titleElement) {
        titleElement.textContent = `Projects (${projects.length})`;
    }
    
    // Render each project
    projects.forEach(project => {
        const article = document.createElement('article');
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title}">
            <p>${project.description}</p>
        `;
        containerElement.appendChild(article);
    });
}
export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}