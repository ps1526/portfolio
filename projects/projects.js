import { fetchJSON, renderProjects } from '../global.js';

async function initProjects() {
    try {
        const projects = await fetchJSON('../lib/projects.json');
        const projectsContainer = document.querySelector('.projects');
        if (projectsContainer) {
            renderProjects(projects, projectsContainer, 'h2');
        }
    } catch (error) {
        console.error('Failed to initialize projects:', error);
    }
}

initProjects();
