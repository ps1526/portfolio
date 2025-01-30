import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function initHomePage() {
    try {
        const projects = await fetchJSON('./lib/projects.json');
        const latestProjects = projects.slice(0, 3).map(project => ({
            ...project,
            image: project.image.replace('../', './') 
        }));
        
        const projectsContainer = document.querySelector('.projects');
        if (projectsContainer) {
            renderProjects(latestProjects, projectsContainer, 'h2');
        }

        // Fetch and display GitHub stats
        const githubData = await fetchGitHubData('ps1526');
        const profileStats = document.querySelector('#profile-stats');
        if (profileStats) {
            profileStats.innerHTML = `
                <dl>
                    <dt>Public Repositories</dt>
                    <dd>${githubData.public_repos}</dd>
                    
                    <dt>Public Gists</dt>
                    <dd>${githubData.public_gists}</dd>
                    
                    <dt>Followers</dt>
                    <dd>${githubData.followers}</dd>
                    
                    <dt>Following</dt>
                    <dd>${githubData.following}</dd>
                </dl>
            `;
        }
    } catch (error) {
        console.error('Failed to initialize home page:', error);
    }
}

initHomePage();