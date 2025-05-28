// ESM module
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    let readmeContent = '';
    
    // Try to read README.md, if it doesn't exist, use profile_README.md as template
    try {
      readmeContent = fs.readFileSync(readmePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        const profileReadmePath = path.join(process.cwd(), 'profile_README.md');
        readmeContent = fs.readFileSync(profileReadmePath, 'utf8');
        console.log('Using profile_README.md as template');
      } else {
        throw error;
      }
    }

    // Update the repositories section
    if (readmeContent.includes('<!-- REPOS-START -->') && readmeContent.includes('<!-- REPOS-END -->')) {
      readmeContent = readmeContent.replace(
        /<!-- REPOS-START -->[\s\S]*?<!-- REPOS-END -->/,
        `<!-- REPOS-START -->\n### 🔄 My Recent Activity\n\n${recentRepos}\n<!-- REPOS-END -->`
      );
    } else {
      console.log('Warning: REPOS markers not found in README. Adding them now.');
      // Add the section if it doesn't exist
      readmeContent += '\n\n<!-- REPOS-START -->\n### 🔄 My Recent Activity\n\n';
      readmeContent += recentRepos;
      readmeContent += '\n<!-- REPOS-END -->\n';
    }

    // Update the repository list section with all repositories
    if (readmeContent.includes('<!-- REPO_LIST_START -->') && readmeContent.includes('<!-- REPO_LIST_END -->')) {
      readmeContent = readmeContent.replace(
        /<!-- REPO_LIST_START -->[\s\S]*?<!-- REPO_LIST_END -->/,
        `<!-- REPO_LIST_START -->\n${allReposFormatted}\n<!-- REPO_LIST_END -->`
      );
    } else {
      console.log('Warning: REPO_LIST markers not found in README. Adding them now.');
      // Add the section if it doesn't exist
      readmeContent += '\n\n<!-- REPO_LIST_START -->\n';
      readmeContent += allReposFormatted;
      readmeContent += '\n<!-- REPO_LIST_END -->\n';
    }

    // Write the updated content back to the README
    fs.writeFileSync(readmePath, readmeContent);
    
    // Also update profile_README.md to keep it in sync (if it exists)
    try {
      const profileReadmePath = path.join(process.cwd(), 'profile_README.md');
      if (fs.existsSync(profileReadmePath)) {
        fs.writeFileSync(profileReadmePath, readmeContent);
        console.log('Both README.md and profile_README.md updated successfully!');
      } else {
        console.log('README.md updated successfully with all repositories!');
      }
    } catch (error) {
      console.log('README.md updated successfully, but failed to update profile_README.md:', error.message);
    }
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1);
  }
}

updateReadme();