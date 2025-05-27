const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

async function updateReadme() {
  try {
    // Initialize Octokit with GitHub token
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    const username = process.env.USERNAME || 'rajatrv-ciso';
    
    // Get all user repositories
    let allRepos = [];
    let page = 1;
    let hasMoreRepos = true;
    
    while (hasMoreRepos) {
      const { data: repos } = await octokit.repos.listForUser({
        username: username,
        per_page: 100,
        page: page
      });
      
      if (repos.length === 0) {
        hasMoreRepos = false;
      } else {
        allRepos = [...allRepos, ...repos];
        page++;
      }
    }

    // Filter public repositories only
    const publicRepos = allRepos.filter(repo => !repo.private);
    
    // Format repositories by most recently updated
    const recentRepos = publicRepos
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5)
      .map(repo => {
        return `- [${repo.name}](${repo.html_url}) - ${repo.description || 'No description provided'}`;
      })
      .join('\n');
    
    // Format all repositories by category
    const ownRepos = publicRepos.filter(repo => !repo.fork);
    const forkedRepos = publicRepos.filter(repo => repo.fork);
    
    const allReposFormatted = `
### My Repositories (${ownRepos.length})

${ownRepos.map(repo => `- [${repo.name}](${repo.html_url}) - ${repo.description || 'No description provided'}`).join('\n')}

### Forked Repositories (${forkedRepos.length})

${forkedRepos.map(repo => `- [${repo.name}](${repo.html_url}) - ${repo.description || 'No description provided'}`).join('\n')}
`;

    // Read the README file
    const readmePath = path.join(process.cwd(), 'README.md');
    let readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Update the repositories section
    readmeContent = readmeContent.replace(
      /<!-- REPOS-START -->[\s\S]*?<!-- REPOS-END -->/,
      `<!-- REPOS-START -->\n### 🔄 My Recent Activity\n\n${recentRepos}\n<!-- REPOS-END -->`
    );

    // Update the repository list section with all repositories
    readmeContent = readmeContent.replace(
      /<!-- REPO_LIST_START -->[\s\S]*?<!-- REPO_LIST_END -->/,
      `<!-- REPO_LIST_START -->\n${allReposFormatted}\n<!-- REPO_LIST_END -->`
    );

    // Write the updated content back to the README
    fs.writeFileSync(readmePath, readmeContent);
    console.log('README updated successfully with all repositories!');
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1);
  }
}

updateReadme();