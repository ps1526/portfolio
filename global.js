console.log('IT’S ALIVE!');

// function $$(selector, context = document) {
//   return Array.from(context.querySelectorAll(selector));
// }

// let navLinks = $$("nav a")
// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname
//   );

// if (currentLink) {
//     currentLink?.classList.add('current');
// }
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
let currentPage = document.querySelector(`nav a[href="${location.pathname}"]`);
if (currentPage) {
    currentPage.classList.add('current');
}

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