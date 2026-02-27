import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const repository = process.env.GITHUB_REPOSITORY ?? ''
const repoName = repository.split('/')[1] ?? 'IdleNetwork'

export default defineConfig({
  base: isGitHubPages ? `/${repoName}/` : '/',
  plugins: [react()]
})
